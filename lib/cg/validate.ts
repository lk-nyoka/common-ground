/**
 * Server-side checks on everything the browser sends. The session lives in the browser, so the
 * server treats it as untrusted: it keeps only known fields, trims text, caps list sizes, and
 * accepts only id-shaped Qloo ids (these are sent on to Qloo as signals).
 */
import type { Favourite, FavouriteType, Person, Pick, Plan, PlanFeedback, Session, Verdict } from './types';

export class InputError extends Error {}

export const LIMITS = {
  name: 24,
  query: 60,
  favourites: 3,
  liked: 30,
  exclusions: 5,
  exclusion: 30,
  plans: 4, // newest kept; the trace is dropped from older ones
  feedback: 12,
  seen: 300,
  rejected: 300,
  verdicts: 12,
  bodyBytes: 400_000
};

const TYPES: FavouriteType[] = ['urn:entity:artist', 'urn:entity:movie', 'urn:entity:tv_show'];
const VERDICTS: Verdict[] = ['both', 'a', 'b', 'neither'];
const ID = /^[A-Za-z0-9_:-]{1,80}$/;

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const arr = (v: unknown): any[] => (Array.isArray(v) ? v : []);

/** Trim, drop control characters and cap length. */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function cleanId(v: unknown): string | undefined {
  return typeof v === 'string' && ID.test(v) ? v : undefined;
}

function cleanFavourite(f: unknown, i: number): Favourite | null {
  if (!isObj(f)) return null;
  const query = cleanText(f.query, LIMITS.query);
  if (!query) return null;
  const type = TYPES.includes(f.type) ? (f.type as FavouriteType) : 'urn:entity:artist';
  const out: Favourite = { id: cleanText(f.id, 40) || `fav-${i}`, query, type };
  const qid = cleanId(f.qlooEntityId);
  if (qid) {
    out.qlooEntityId = qid;
    if (f.qlooName) out.qlooName = cleanText(f.qlooName, 120);
    if (typeof f.image === 'string' && /^https:\/\//.test(f.image)) out.image = f.image.slice(0, 500);
    if (Array.isArray(f.tags)) out.tags = f.tags.slice(0, 60).map((t: unknown) => cleanText(t, 60)).filter(Boolean);
    if (Array.isArray(f.tagIds)) out.tagIds = f.tagIds.filter((t: unknown) => typeof t === 'string' && /^urn:tag:[a-z0-9_:.-]{1,120}$/.test(t)).slice(0, 12);
  }
  if (f.unmatched === true) out.unmatched = true;
  return out;
}

function cleanPerson(p: unknown, id: 'a' | 'b'): Person {
  const src = isObj(p) ? p : {};
  return {
    id,
    name: cleanText(src.name, LIMITS.name) || (id === 'a' ? 'You' : 'Them'),
    favourites: arr(src.favourites).slice(0, LIMITS.favourites).map(cleanFavourite).filter(Boolean) as Favourite[],
    liked: arr(src.liked)
      .slice(-LIMITS.liked)
      .map((l) => (isObj(l) && cleanId(l.qlooEntityId) ? { qlooEntityId: l.qlooEntityId as string, name: cleanText(l.name, 120) } : null))
      .filter(Boolean) as Person['liked']
  };
}

function cleanPick(p: unknown): Pick | undefined {
  if (!isObj(p)) return undefined;
  const qid = cleanId(p.qlooEntityId);
  if (!qid) return undefined;
  return { ...(p as Pick), id: `pick-${qid}`, qlooEntityId: qid, name: cleanText(p.name, 120), reason: cleanText(p.reason, 400) };
}

function cleanPlan(p: unknown, keepTrace: boolean): Plan | null {
  if (!isObj(p)) return null;
  const plan = p as Plan;
  return {
    ...plan,
    watch: cleanPick(plan.watch),
    alsoWatch: arr(plan.alsoWatch).slice(0, 3).map(cleanPick).filter(Boolean) as Pick[],
    listen: arr(plan.listen).slice(0, 3).map(cleanPick).filter(Boolean) as Pick[],
    swap: { forA: cleanPick(plan.swap?.forA), forB: cleanPick(plan.swap?.forB) },
    local: arr(plan.local).slice(0, 3).map(cleanPick).filter(Boolean) as Pick[],
    commonGround: arr(plan.commonGround).slice(0, 8),
    why: arr(plan.why).slice(0, 3).map((w) => cleanText(w, 300)),
    tonight: cleanText(plan.tonight, 500),
    notices: arr(plan.notices).slice(0, 4).map((n) => cleanText(n, 300)),
    trace: keepTrace ? arr(plan.trace).slice(0, 60) : [],
    number: Number.isFinite(plan.number) ? Math.max(1, Math.floor(plan.number)) : 1
  };
}

export function cleanSession(input: unknown): Session {
  if (!isObj(input) || !Array.isArray(input.people) || input.people.length !== 2) throw new InputError('Two people are needed.');
  const people: [Person, Person] = [cleanPerson(input.people[0], 'a'), cleanPerson(input.people[1], 'b')];
  if (!people[0].favourites.length || !people[1].favourites.length) throw new InputError('Each person needs at least one favourite.');
  const minutes = Number(input.minutes);
  const ids = (v: unknown, max: number) => Array.from(new Set(arr(v).map(cleanId).filter(Boolean) as string[])).slice(-max);
  return {
    id: cleanText(input.id, 60) || `s-${Date.now().toString(36)}`,
    isSample: input.isSample === true,
    people,
    minutes: Number.isFinite(minutes) ? Math.min(300, Math.max(15, Math.round(minutes))) : 120,
    exclusions: arr(input.exclusions).slice(0, LIMITS.exclusions).map((e) => cleanText(e, LIMITS.exclusion)).filter(Boolean),
    country: typeof input.country === 'string' && /^[a-z]{2}$/.test(input.country) ? input.country : 'za',
    includeLocal: input.includeLocal !== false,
    ...(isObj(input.pair) && typeof input.pair.id === 'string' && /^[A-Za-z0-9_-]{10,20}$/.test(input.pair.id) && (input.pair.me === 'a' || input.pair.me === 'b')
      ? { pair: { id: input.pair.id, me: input.pair.me } }
      : {}),
    plans: arr(input.plans).slice(0, LIMITS.plans).map((p, i) => cleanPlan(p, i === 0)).filter(Boolean) as Plan[],
    feedback: arr(input.feedback).slice(0, LIMITS.feedback).filter(isObj) as PlanFeedback[],
    seen: ids(input.seen, LIMITS.seen),
    rejected: ids(input.rejected, LIMITS.rejected),
    tally: isObj(input.tally) ? (input.tally as Session['tally']) : {}
  };
}

export function cleanVerdicts(input: unknown): Record<string, Verdict> {
  if (!isObj(input)) throw new InputError('Reactions are missing.');
  const out: Record<string, Verdict> = {};
  for (const [k, v] of Object.entries(input).slice(0, LIMITS.verdicts)) {
    if (/^pick-[A-Za-z0-9_:-]{1,80}$/.test(k) && VERDICTS.includes(v as Verdict)) out[k] = v as Verdict;
  }
  if (!Object.keys(out).length) throw new InputError('Tap who liked at least one thing first.');
  return out;
}

/** Trim a session before it goes back to the browser, so it can't grow without bound. */
export function trimForClient(s: Session): Session {
  return {
    ...s,
    plans: s.plans.slice(0, LIMITS.plans).map((p, i) => (i === 0 ? p : { ...p, trace: [] })),
    feedback: s.feedback.slice(0, LIMITS.feedback),
    seen: s.seen.slice(-LIMITS.seen),
    rejected: s.rejected.slice(-LIMITS.rejected),
    people: s.people.map((p) => ({ ...p, liked: p.liked.slice(-LIMITS.liked) })) as Session['people']
  };
}
