/**
 * Common Ground planning agent (server-side only).
 *
 * 1. Match each person's favourites in Qloo (/search).
 * 2. In parallel: Qloo compare (shared taste tags), and Qloo insights for films, TV and
 *    artists from both people's signals together, plus artists from each person's side.
 * 3. Verify shared tags against each person's own Qloo tags, so the card stays precise.
 * 4. Pick tonight's plan: with GEMINI_API_KEY, an LLM chooses (it may call Qloo again);
 *    otherwise fixed rules. Every pick must be a Qloo result; invented picks are ignored.
 * Names of the people are never sent to Qloo or the LLM.
 */
import type { AgentTraceStep, QlooEntity, QlooStatus } from '../types';
import { qlooCompare, qlooKeyIsSet, qlooRelated, qlooScore, qlooSearch, savedFixtureCount } from '../qloo-client';
import { extractJson, FunctionDeclaration, GeminiContent, GeminiPart, geminiGenerate, llmIsConfigured, modelOf } from '../llm';
import { fold, namesMatch } from './match';
import type { Favourite, Person, PersonFit, PersonId, Pick, PickFit, PickKind, Plan, Session, SharedTag } from './types';

type Source = 'live' | 'saved' | 'unavailable';

const MAX_SIGNALS = 6;
const MAX_EXTRA_TOOL_CALLS = 3;

function linkFor(name: string, type: string): Pick['link'] {
  if (type.includes('artist')) return { label: 'Find on Spotify', url: `https://open.spotify.com/search/${encodeURIComponent(name)}` };
  return { label: 'Find a trailer', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} trailer`)}` };
}

class Run {
  trace: AgentTraceStep[] = [];
  sources: Source[] = [];
  errors: string[] = [];
  savedDates: string[] = [];
  extraCalls = 0;
  start = Date.now();
  /** The whole plan aims to finish within this budget; the AI gets whatever Qloo leaves. */
  deadline = this.start + 42000;
  constructor(private onStep?: (step: AgentTraceStep) => void) {}

  add(type: AgentTraceStep['type'], action: string, details: string) {
    const step = { step: this.trace.length + 1, type, action, details, ms: Date.now() - this.start };
    this.trace.push(step);
    try {
      this.onStep?.(step);
    } catch {
      /* a broken listener must never break planning */
    }
  }
  note(source: Source, capturedAt?: string, error?: string) {
    this.sources.push(source);
    if (capturedAt) this.savedDates.push(capturedAt);
    if (error && source === 'unavailable') this.errors.push(error);
  }
  status(): QlooStatus {
    if (this.sources.includes('live')) return 'live';
    if (this.sources.includes('saved')) return 'saved';
    if (qlooKeyIsSet() && this.errors.length) return 'error';
    return 'not_connected';
  }
}

function tag(source: Source, capturedAt?: string) {
  return source === 'live' ? 'Qloo live' : source === 'saved' ? `saved Qloo response${capturedAt ? ` from ${capturedAt.slice(0, 10)}` : ''}` : 'unavailable';
}

function short(type: string) {
  return type.replace('urn:entity:', '').replace('tv_show', 'TV show');
}

/** Step 1: match every favourite in Qloo, in parallel. */
async function resolveFavourites(run: Run, session: Session) {
  const jobs: { fav: Favourite }[] = [];
  for (const p of session.people) for (const fav of p.favourites) if (!fav.qlooEntityId && !fav.unmatched && fav.query.trim()) jobs.push({ fav });
  const results = await Promise.all(jobs.map(({ fav }) => qlooSearch(fav.query, fav.type, 5)));
  // If Qloo was busy for some searches, try those once more, one at a time.
  for (let i = 0; i < results.length; i++) {
    if (results[i].source === 'unavailable' && Date.now() < run.deadline - 20000) {
      await new Promise((r) => setTimeout(r, 800));
      results[i] = await qlooSearch(jobs[i].fav.query, jobs[i].fav.type, 5);
    }
  }
  // No exact match in the kind they chose? Try the other two kinds ("The Office" as a TV show).
  const KINDS = ['urn:entity:artist', 'urn:entity:movie', 'urn:entity:tv_show'] as const;
  const other = await Promise.all(
    results.map(async (res, i) => {
      const fav = jobs[i].fav;
      if (res.source === 'unavailable' || res.data.some((e) => namesMatch(e.name, fav.query))) return undefined;
      const tries = await Promise.all(KINDS.filter((k) => k !== fav.type).map((k) => qlooSearch(fav.query, k, 5)));
      return tries.flatMap((t) => t.data).find((e) => namesMatch(e.name, fav.query));
    })
  );
  results.forEach((res, i) => {
    const fav = jobs[i].fav;
    run.note(res.source, res.capturedAt, res.error);
    let match = res.data.find((e) => namesMatch(e.name, fav.query));
    run.add('tool_call', 'qloo_search', `qloo_search(query="${fav.query}", type="${fav.type}")`);
    if (!match && other[i]) {
      match = other[i];
      fav.type = match.type as Favourite['type'];
    }
    if (res.source === 'unavailable') {
      run.add('tool_result', 'qloo_search result', `No answer: ${res.error || 'unavailable'}.`);
      return;
    }
    if (match) {
      fav.qlooEntityId = match.id;
      fav.qlooName = match.name;
      fav.image = match.image;
      fav.tags = match.tags;
      fav.tagIds = match.tagIds;
      run.add('tool_result', 'qloo_search result', `Matched "${match.name}" (${short(match.type)}) [${tag(res.source, res.capturedAt)}].`);
    } else {
      fav.unmatched = true;
      run.add('tool_result', 'qloo_search result', `No close match for "${fav.query}" [${tag(res.source, res.capturedAt)}]; left out.`);
    }
  });
}

function signalsOf(p: Person): string[] {
  const ids = [...p.favourites.filter((f) => f.qlooEntityId).map((f) => f.qlooEntityId!), ...p.liked.map((l) => l.qlooEntityId)];
  return Array.from(new Set(ids)).slice(0, MAX_SIGNALS);
}

function excludedBy(session: Session, e: QlooEntity): string | undefined {
  const name = fold(e.name);
  const tags = (e.tags || []).map(fold);
  for (const x of session.exclusions) {
    const f = fold(x);
    if (f.length < 3) continue;
    if (name.includes(f) || tags.some((t) => t === f || t.includes(f))) return x;
  }
  return undefined;
}

interface Pools {
  movies: QlooEntity[];
  tv: QlooEntity[];
  artists: QlooEntity[]; // from both together
  aWorld: QlooEntity[]; // artists from A's side
  bWorld: QlooEntity[]; // artists from B's side
  local: QlooEntity[]; // South African artists for both tastes (Qloo's South Africa music tag)
  sourceOf: Map<string, { source: Source; capturedAt?: string }>;
  fit: Map<string, PickFit>; // Qloo evidence per candidate id
}

/** Qloo tags verified on the hackathon API (Oct 2026). */
export const SA_MUSIC_TAG = 'urn:tag:genre:music:south_africa';

async function related(
  run: Run,
  session: Session,
  label: string,
  ids: string[],
  type: string,
  take: number,
  pools: Pools,
  opts: { explain?: boolean; tags?: string; locationQuery?: string } = {}
) {
  const res = await qlooRelated(ids.join(','), type, { take, explain: opts.explain, tags: opts.tags, locationQuery: opts.locationQuery });
  run.note(res.source, res.capturedAt, res.error);
  run.add('tool_call', 'qloo_related', `qloo_related(from=${label}, target_type="${type}")`);
  if (res.source === 'unavailable') {
    run.add('tool_result', 'qloo_related result', `No answer: ${res.error || 'unavailable'}.`);
    return [] as QlooEntity[];
  }
  const favIds = new Set(session.people.flatMap((p) => p.favourites.map((f) => f.qlooEntityId)).filter(Boolean) as string[]);
  const kept: QlooEntity[] = [];
  const dropped: string[] = [];
  for (const e of res.data) {
    if (favIds.has(e.id)) dropped.push(`${e.name} (already a favourite)`);
    else if (session.seen.includes(e.id)) dropped.push(`${e.name} (suggested before)`);
    else if (session.rejected.includes(e.id)) dropped.push(`${e.name} (neither of you liked it)`);
    else if (type === 'urn:entity:movie' && e.durationMinutes && e.durationMinutes > session.minutes)
      dropped.push(`${e.name} (${e.durationMinutes} min, longer than your ${session.minutes})`);
    else {
      const ex = excludedBy(session, e);
      if (ex) dropped.push(`${e.name} (excluded: ${ex})`);
      else {
        kept.push(e);
        pools.sourceOf.set(e.id, { source: res.source, capturedAt: res.capturedAt });
      }
    }
  }
  run.add(
    'tool_result',
    'qloo_related result',
    `${res.data.length} returned [${tag(res.source, res.capturedAt)}]; kept ${kept.length}${
      kept.length ? `: ${kept.slice(0, 4).map((k) => `${k.name}${k.year ? ` (${k.year})` : ''}`).join(', ')}` : ''
    }${dropped.length ? `; dropped ${dropped.length}: ${dropped.slice(0, 3).join(', ')}` : ''}.`
  );
  return kept;
}

/**
 * The Mutual Fit Proof. For each list of candidates, ask Qloo how strongly each person's taste
 * scores every candidate (filter.results.entities), then rank candidates per person. For swaps,
 * score the other person's world against the person who will receive it.
 */
type ScoreJob = { list: QlooEntity[]; type: string; who: ('a' | 'b')[] };

/** Score one or more candidate lists for each person (filter.results.entities). Returns counts. */
/** Each person's favourites' tag ids, for scoring across domains. */
function tagSignalsOf(p: Person): string[] {
  return Array.from(new Set(p.favourites.flatMap((f) => (f.qlooEntityId ? (f.tagIds || []).slice(0, 6) : [])))).slice(0, 12);
}

async function scoreJobs(run: Run, pools: Pools, jobs: ScoreJob[], aSig: string[], bSig: string[], tagSig: { a: string[]; b: string[] } = { a: [], b: [] }) {
  const calls = jobs.filter((j) => j.list.length > 0).flatMap((j) => j.who.map((w) => ({ job: j, who: w })));
  const results = await Promise.all(calls.map((c) => qlooScore(c.who === 'a' ? aSig : bSig, c.job.type, c.job.list.map((e) => e.id))));
  // Qloo gives no direct score across some domains (films for a music-only favourite). Then score
  // that person again from their favourites' tags, and mark it, so every pick still has a rank for both.
  const viaTags = new Set<number>();
  await Promise.all(
    results.map(async (res, i) => {
      const { job, who } = calls[i];
      const tags = tagSig[who];
      if (res.source === 'unavailable' || Object.keys(res.data).length || !tags.length) return;
      const again = await qlooScore(tags, job.type, job.list.map((e) => e.id), { bySignalTags: true });
      if (Object.keys(again.data).length) {
        results[i] = again;
        viaTags.add(i);
      }
    })
  );
  if (viaTags.size) {
    const who = Array.from(new Set(Array.from(viaTags).map((i) => calls[i].who)));
    run.add('guardrail', 'Scored across domains', `Qloo has no direct score for these ${short(calls[Array.from(viaTags)[0]].job.type)}s from ${who.length === 2 ? 'either of your' : 'one person’s'} favourites, so they were scored from the favourites' own Qloo tags instead.`);
  }
  let scored = 0;
  results.forEach((res, i) => {
    const { job, who } = calls[i];
    run.note(res.source, res.capturedAt, res.error);
    if (res.source === 'unavailable') return;
    const ranked = job.list.filter((e) => typeof res.data[e.id] === 'number').sort((x, y) => res.data[y.id] - res.data[x.id]);
    const hi = ranked.length ? res.data[ranked[0].id] : 0;
    const lo = ranked.length ? res.data[ranked[ranked.length - 1].id] : 0;
    ranked.forEach((e, idx) => {
      const fit = pools.fit.get(e.id) || { of: job.list.length };
      const pf: PersonFit = { affinity: res.data[e.id], rank: idx + 1, norm: hi > lo ? (res.data[e.id] - lo) / (hi - lo) : 0.5 };
      if (viaTags.has(i)) pf.via = 'tags';
      fit[who] = pf;
      fit.of = job.list.length;
      pools.fit.set(e.id, fit);
    });
    scored += ranked.length;
  });
  return { calls: calls.length, scored };
}

/** After scoring: joint positions, the explainability split, and one summary step in the trace. */
function finishScoring(run: Run, pools: Pools, aSig: string[], bSig: string[], totals: { calls: number; scored: number }) {
  const aSet = new Set(aSig);
  const bSet = new Set(bSig);
  for (const list of [pools.movies, pools.tv, pools.artists]) {
    list.forEach((e, idx) => {
      const fit = pools.fit.get(e.id) || { of: list.length };
      fit.jointRank = idx + 1;
      if (e.explain) {
        let a = 0;
        let b = 0;
        for (const [id, score] of Object.entries(e.explain)) {
          if (aSet.has(id) && !bSet.has(id)) a += score;
          else if (bSet.has(id) && !aSet.has(id)) b += score;
        }
        if (a + b > 0) fit.share = { a: a / (a + b), b: b / (a + b) };
      }
      pools.fit.set(e.id, fit);
    });
  }
  run.add('tool_call', 'qloo_score', `Scored every candidate against each person's taste on its own (${totals.calls} Qloo calls with filter.results.entities).`);
  run.add(
    'tool_result',
    'qloo_score result',
    totals.scored ? `${totals.scored} scores returned. Each pick now shows its rank for each of you.` : 'No scores came back, so picks show no per-person ranks this time.'
  );
}

/**
 * Fairness (maximin): a pick is only as good as it is for the person it suits least, measured on
 * each person's own scale (see PersonFit.norm). Qloo's raw affinity breaks ties, so in a very small
 * pool the pick with the better worse-case affinity still wins. Unscored candidates score 0.
 */
/**
 * Maximin fairness on each person's own ranking of tonight's candidates (the same ranks the card
 * shows), so the pick put first is the one whose worse rank is best. Ties go to the affinity-scaled
 * position, then to the weaker person's raw affinity.
 */
export function fairScore(fit: PickFit | undefined): number {
  if (!fit?.a || !fit?.b) return 0;
  const pos = (rank: number) => (fit.of > 1 ? 1 - (rank - 1) / (fit.of - 1) : 1);
  return (
    Math.min(pos(fit.a.rank), pos(fit.b.rank)) +
    0.01 * Math.min(fit.a.norm, fit.b.norm) +
    0.001 * Math.min(fit.a.affinity, fit.b.affinity) +
    0.00001 * (fit.a.norm + fit.b.norm)
  );
}

/** True when a pick ranks in the top half of tonight's candidates for each person on their own. */
export function topHalfForBoth(fit: PickFit | undefined): boolean {
  if (!fit?.a || !fit?.b) return false;
  const half = Math.ceil(fit.of / 2);
  return fit.a.rank <= half && fit.b.rank <= half;
}

function byFairness(list: QlooEntity[], pools: Pools): QlooEntity[] {
  if (!list.some((e) => pools.fit.get(e.id)?.a || pools.fit.get(e.id)?.b)) return list; // no scores: keep Qloo's order
  return [...list].sort((x, y) => fairScore(pools.fit.get(y.id)) - fairScore(pools.fit.get(x.id)));
}

/** For a swap, the best item is the one the receiving person's taste scores highest. */
function byReceiver(list: QlooEntity[], pools: Pools, who: 'a' | 'b'): QlooEntity[] {
  if (!list.some((e) => pools.fit.get(e.id)?.[who])) return list;
  return [...list].sort((x, y) => (pools.fit.get(y.id)?.[who]?.affinity ?? 0) - (pools.fit.get(x.id)?.[who]?.affinity ?? 0));
}

/** Shared tags from Qloo compare, verified against each person's own favourites' tags. */
function verifyTags(session: Session, raw: { name: string; subtype: string; score: number }[]): SharedTag[] {
  const tagSet = (p: Person) => new Set(p.favourites.flatMap((f) => f.tags || []).map(fold));
  const a = tagSet(session.people[0]);
  const b = tagSet(session.people[1]);
  const seen = new Set<string>();
  const tags: SharedTag[] = [];
  for (const t of raw) {
    const key = fold(t.name);
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push({ ...t, confirmed: a.has(key) && b.has(key) });
  }
  // Tags about the music or story (genre, mood, theme) say more than tags about fans ("Loyal").
  const aboutFans = (t: SharedTag) => t.subtype.includes('audience');
  return tags
    .sort((x, y) => Number(y.confirmed) - Number(x.confirmed) || Number(aboutFans(x)) - Number(aboutFans(y)) || y.score - x.score)
    .slice(0, 6);
}

function toPick(e: QlooEntity, kind: PickKind, forWhom: 'both' | PersonId, reason: string, pools: Pools): Pick {
  const src = pools.sourceOf.get(e.id) || { source: 'live' as Source };
  return {
    id: `pick-${e.id}`,
    qlooEntityId: e.id,
    name: e.name,
    type: e.type,
    kind,
    forWhom,
    reason,
    year: e.year,
    activeFrom: e.activeFrom,
    image: e.image,
    description: e.description,
    contentRating: e.contentRating,
    affinity: e.affinity,
    durationMinutes: e.durationMinutes,
    fit: pools.fit.get(e.id),
    external: e.external,
    local: pools.local.some((x) => x.id === e.id) || undefined,
    provenance: src.source === 'saved' ? 'qloo_saved' : 'qloo_live',
    capturedAt: src.source === 'saved' ? src.capturedAt : undefined,
    link: linkFor(e.name, e.type)
  };
}

const favNames = (p: Person) => p.favourites.filter((f) => f.qlooEntityId).map((f) => f.qlooName || f.query);

interface Choice {
  watchId?: string;
  alsoIds: string[];
  listenIds: string[];
  forAId?: string;
  forBId?: string;
  why?: string[];
  tonight?: string;
  reasons: Record<string, string>;
  model?: string; // the Gemini model that wrote the final plan
}

/**
 * Rules planner. Picks are ordered by fairness: the best pick is the one whose worse score,
 * across the two people, is highest. Swaps go to whoever's taste scores them highest.
 */
function rulesChoice(session: Session, pools: Pools): Choice {
  const short = session.minutes <= 60;
  const first = byFairness(short ? pools.tv : pools.movies, pools);
  const second = byFairness(short ? pools.movies : pools.tv, pools);
  const watch = first[0] || second[0];
  const also = [second.find((e) => e.id !== watch?.id), first.find((e) => e.id !== watch?.id)].filter(Boolean) as QlooEntity[];
  const listen = byFairness(pools.artists, pools).slice(0, 3);
  const used = new Set(listen.map((l) => l.id));
  const forB = byReceiver(pools.aWorld, pools, 'b').find((e) => !used.has(e.id));
  if (forB) used.add(forB.id);
  const forA = byReceiver(pools.bWorld, pools, 'a').find((e) => !used.has(e.id));
  return {
    watchId: watch?.id,
    alsoIds: Array.from(new Set(also.map((e) => e.id))).slice(0, 2),
    listenIds: listen.map((e) => e.id),
    forAId: forA?.id,
    forBId: forB?.id,
    reasons: {}
  };
}

/** Plain-language evidence for the brief, e.g. "{A} #2, {B} #4 of 10; 55% from {A}'s favourites". */
function fitText(fit: PickFit | undefined, only?: 'a' | 'b') {
  if (!fit) return '';
  const part = (w: 'a' | 'b') => (fit[w] ? `{${w.toUpperCase()}} #${fit[w]!.rank}` : '');
  const ranks = (only ? [part(only)] : [part('a'), part('b')]).filter(Boolean).join(', ');
  const share = fit.share && !only ? `; ${Math.round(fit.share.a * 100)}% from {A}'s favourites` : '';
  return ranks ? ` [fit: ${ranks} of ${fit.of}${share}]` : '';
}

const TOOLS: FunctionDeclaration[] = [
  {
    name: 'qloo_related',
    description:
      "Ask Qloo's taste graph for entities of target_type that people with an affinity for the given entities also like. Use it to explore further, e.g. from something they both loved before.",
    parameters: {
      type: 'OBJECT',
      properties: {
        entity_ids: { type: 'STRING', description: 'Comma-separated Qloo entity ids from the brief.' },
        target_type: { type: 'STRING', description: 'Entity type to return.', enum: ['urn:entity:movie', 'urn:entity:tv_show', 'urn:entity:artist'] }
      },
      required: ['entity_ids', 'target_type']
    }
  }
];

const SYSTEM = `You are the planning agent for Common Ground, which helps two people find something they will both enjoy together. You do not know their names: call them {A} and {B}.

You get each person's favourites, Qloo's shared taste tags, candidate lists from Qloo with ids, the time they have, things to avoid, and what worked before.
Choose tonight's plan from the candidates only:
- one thing to watch (a film, or a TV show if time is short)
- two alternatives to watch
- three artists to listen to together
- one artist from {A}'s side for {B} to try, and one from {B}'s side for {A}
Each candidate shows its fit: its rank for {A}'s taste and for {B}'s taste among the candidates Qloo scored
(#1 = best), and how much each person's favourites drove it. Choose picks that rank well for BOTH people.
Don't choose a pick that sits in the bottom third for either person unless nothing better exists.
For swaps, prefer the candidate with the best rank for the person receiving it.
You may call qloo_related at most ${MAX_EXTRA_TOOL_CALLS} times to explore further.
Then reply with ONE JSON object and nothing else:
{"watch_id": "...", "also_ids": ["..."], "listen_ids": ["..."], "for_a_id": "...", "for_b_id": "...",
 "reasons": {"<id>": "one short reason tied to the shared tags or favourites"},
 "why": ["three short reasons for this plan"], "tonight": "one or two sentences: how to spend the time"}
Only use ids that appear in the brief or in tool results. Never invent titles, facts or connections. Always write the people as {A} and {B}, with the braces. Never promise they will enjoy or love something: say why it may suit them, based on the tags, favourites and fit. Keep it warm and brief.`;

async function llmChoice(run: Run, session: Session, pools: Pools, tags: SharedTag[]): Promise<Choice> {
  const [A, B] = session.people;
  const list = (es: QlooEntity[], only?: 'a' | 'b') =>
    es
      .map(
        (e) =>
          `  - id "${e.id}": ${e.name}${e.year ? ` (${e.year})` : e.activeFrom ? ` (from ${e.activeFrom})` : ''}${e.durationMinutes ? `, ${e.durationMinutes} min` : ''}${
            e.contentRating ? `, ${e.contentRating}` : ''
          }${fitText(pools.fit.get(e.id), only)}`
      )
      .join('\n') || '  - none';
  const last = session.feedback[0];
  const lastLine = last ? Object.entries(last.verdicts).map(([id, v]) => `${last.names[id]}: ${v === 'both' ? 'both loved' : v === 'neither' ? 'neither liked' : `only {${v.toUpperCase()}} liked`}`).join('; ') : 'no earlier plans';
  const brief = `Time together: ${session.minutes} minutes, at home.
Avoid: ${session.exclusions.join(', ') || 'nothing given'}
{A}'s favourites: ${favNames(A).join(', ') || 'none matched'}; also liked before: ${A.liked.map((l) => l.name).join(', ') || 'none'}
{B}'s favourites: ${favNames(B).join(', ') || 'none matched'}; also liked before: ${B.liked.map((l) => l.name).join(', ') || 'none'}
Shared taste tags from Qloo compare (confirmed = on both people's own favourites): ${tags.map((t) => `${t.name}${t.confirmed ? ' (confirmed)' : ''}`).join(', ') || 'none'}
Last plan: ${lastLine}
Signal ids you may pass to qloo_related: ${[...signalsOf(A), ...signalsOf(B)].map((id) => `"${id}"`).join(', ')}
Films from both tastes together:
${list(pools.movies)}
TV from both tastes together:
${list(pools.tv)}
Artists from both tastes together:
${list(pools.artists)}
Artists from {A}'s side (candidates for {B} to try; fit is {B}'s):
${list(pools.aWorld, 'b')}
Artists from {B}'s side (candidates for {A} to try; fit is {A}'s):
${list(pools.bWorld, 'a')}`;

  run.add('thought', 'Agent briefed', `The planning model receives favourites, shared tags, Qloo candidates, time and exclusions. It does not receive either person's name.`);
  const contents: GeminiContent[] = [{ role: 'user', parts: [{ text: brief }] }];
  const known = new Set([...signalsOf(A), ...signalsOf(B), ...[...pools.movies, ...pools.tv, ...pools.artists, ...pools.aWorld, ...pools.bWorld].map((e) => e.id)]);
  let text = '';
  let usedModel: string | undefined;
  for (let turn = 0; turn < 4; turn++) {
    const remaining = run.deadline - Date.now();
    if (remaining < 8000) break;
    const reply = await geminiGenerate({ system: SYSTEM, contents, tools: TOOLS, allowTools: run.extraCalls < MAX_EXTRA_TOOL_CALLS && remaining > 15000, timeoutMs: Math.min(20000, remaining - 3000) });
    usedModel = modelOf(reply) || usedModel;
    contents.push(reply);
    const calls = reply.parts.filter((p) => p.functionCall);
    text = reply.parts.map((p) => p.text || '').join('').trim();
    if (calls.length === 0) break;
    const responses: GeminiPart[] = await Promise.all(
      calls.map(async (part): Promise<GeminiPart> => {
        const fc = part.functionCall!;
        const ids = String(fc.args.entity_ids || '').split(',').map((s) => s.trim()).filter(Boolean);
        const type = String(fc.args.target_type || '');
        let response: Record<string, unknown>;
        if (run.extraCalls >= MAX_EXTRA_TOOL_CALLS) response = { error: 'Tool limit reached. Reply with the JSON plan.' };
        else if (!ids.length || ids.some((id) => !known.has(id))) {
          run.add('guardrail', 'Refused a tool call', `The model asked for ids Qloo never returned (${ids.join(', ')}). Refused.`);
          response = { error: 'Use only ids from the brief.' };
        } else {
          run.extraCalls++;
          const got = await related(run, session, 'ids chosen by the agent', ids, type, 8, pools);
          const pool = type.includes('movie') ? pools.movies : type.includes('tv') ? pools.tv : pools.artists;
          for (const e of got) if (!pool.some((x) => x.id === e.id)) pool.push(e);
          got.forEach((e) => known.add(e.id));
          response = { candidates: got.map((e) => ({ id: e.id, name: e.name, year: e.year ?? null })) };
        }
        return { functionResponse: { name: fc.name, response, ...(fc.id ? { id: fc.id } : {}) } };
      })
    );
    contents.push({ role: 'user', parts: responses });
  }
  let plan = extractJson(text);
  if (!plan) {
    contents.push({ role: 'user', parts: [{ text: 'Reply now with the JSON object only.' }] });
    const reply = await geminiGenerate({ system: SYSTEM, contents, tools: TOOLS, allowTools: false, timeoutMs: 15000 });
    usedModel = modelOf(reply) || usedModel;
    plan = extractJson(reply.parts.map((p) => p.text || '').join(''));
  }
  if (!plan) throw new Error('the model did not return a JSON plan');

  const inPool = (id: unknown, pool: QlooEntity[]) => (typeof id === 'string' && pool.some((e) => e.id === id) ? id : undefined);
  const watchPool = [...pools.movies, ...pools.tv];
  const choice: Choice = {
    watchId: inPool(plan.watch_id, watchPool),
    alsoIds: (Array.isArray(plan.also_ids) ? plan.also_ids : []).map((id: unknown) => inPool(id, watchPool)).filter(Boolean).slice(0, 2),
    listenIds: (Array.isArray(plan.listen_ids) ? plan.listen_ids : []).map((id: unknown) => inPool(id, [...pools.artists, ...pools.aWorld, ...pools.bWorld])).filter(Boolean).slice(0, 3),
    forAId: inPool(plan.for_a_id, pools.bWorld),
    forBId: inPool(plan.for_b_id, pools.aWorld),
    why: Array.isArray(plan.why) ? plan.why.map(String).slice(0, 3) : undefined,
    tonight: typeof plan.tonight === 'string' ? plan.tonight : undefined,
    reasons: plan.reasons && typeof plan.reasons === 'object' ? Object.fromEntries(Object.entries(plan.reasons).map(([k, v]) => [k, String(v)])) : {},
    model: usedModel
  };
  const asked = [plan.watch_id, ...(plan.also_ids || []), ...(plan.listen_ids || []), plan.for_a_id, plan.for_b_id].filter(Boolean).length;
  const valid = [choice.watchId, ...choice.alsoIds, ...choice.listenIds, choice.forAId, choice.forBId].filter(Boolean).length;
  if (asked > valid) run.add('guardrail', 'Ignored invalid picks', `${asked - valid} of the model's picks weren't in the right Qloo list and were ignored.`);
  if (!choice.watchId && !choice.listenIds.length) throw new Error('the model picked nothing usable');
  return choice;
}

/**
 * The agent's own check on the AI's choice. If the AI picked something to watch that sits in the
 * bottom third for either person while a fairer option exists, swap it and say so in the trace.
 */
function critic(run: Run, session: Session, pools: Pools, choice: Choice): Choice {
  const fit = choice.watchId ? pools.fit.get(choice.watchId) : undefined;
  if (!fit || !fit.a || !fit.b) return choice;
  // Compare like with like: ranks are only comparable within the same list (films or TV).
  const sameList = pools.movies.some((e) => e.id === choice.watchId) ? pools.movies : pools.tv;
  const pool = sameList.filter((e) => e.id !== choice.watchId);
  const better = byFairness(pool, pools)[0];
  // "Low" means the bottom half of that person's own ranking of tonight's candidates: the same
  // test the Mutual Fit Proof shows on the card.
  const lowForSomeone = !topHalfForBoth(fit);
  const betterFit = better ? pools.fit.get(better.id) : undefined;
  const betterIsTopHalf = topHalfForBoth(betterFit);
  if (!lowForSomeone || !better || !betterIsTopHalf || fairScore(betterFit) <= fairScore(fit) + 0.005) {
    run.add(
      'guardrail',
      'Checked the pick is fair',
      lowForSomeone
        ? 'The film or show is in the bottom half for one of you, but no candidate is in the top half for both, so it stands as the most even option.'
        : "The film or show is in the top half of tonight's candidates for both of you, so the AI's choice stands."
    );
    return choice;
  }
  const name = (id?: string) => [...pools.movies, ...pools.tv].find((e) => e.id === id)?.name || 'its pick';
  const lowFor = fit.a.rank > fit.b.rank ? session.people[0].name : session.people[1].name;
  run.add('guardrail', 'Replaced an unfair pick', `${name(choice.watchId)} ranked in the bottom half for ${lowFor}, so ${better.name}, which is in the top half for both of you, is tonight's pick instead.`);
  const reasons = { ...choice.reasons };
  delete reasons[choice.watchId!];
  return { ...choice, watchId: better.id, alsoIds: choice.alsoIds.filter((id) => id !== better.id), reasons };
}

/** If the AI left a slot empty, fill it from the fair rules ranking, so every plan is complete. */
function fillGaps(run: Run, choice: Choice, rules: Choice): Choice {
  const used = new Set([choice.watchId, ...choice.alsoIds, ...choice.listenIds, choice.forAId, choice.forBId].filter(Boolean) as string[]);
  const take = (ids: (string | undefined)[], n: number, have: string[]) => {
    const out = [...have];
    for (const id of ids) {
      if (out.length >= n) break;
      if (id && !used.has(id)) {
        out.push(id);
        used.add(id);
      }
    }
    return out;
  };
  const filled: string[] = [];
  const next: Choice = { ...choice };
  if (!next.watchId && rules.watchId && !used.has(rules.watchId)) {
    next.watchId = rules.watchId;
    used.add(rules.watchId);
    filled.push('the pick to watch');
  }
  const also = take([rules.watchId, ...rules.alsoIds], 2, next.alsoIds);
  if (also.length > next.alsoIds.length) filled.push(`${also.length - next.alsoIds.length} alternative(s)`);
  next.alsoIds = also;
  const listen = take(rules.listenIds, 3, next.listenIds);
  if (listen.length > next.listenIds.length) filled.push(`${listen.length - next.listenIds.length} artist(s)`);
  next.listenIds = listen;
  if (!next.forAId && rules.forAId && !used.has(rules.forAId)) {
    next.forAId = rules.forAId;
    used.add(rules.forAId);
    filled.push('a swap');
  }
  if (!next.forBId && rules.forBId && !used.has(rules.forBId)) {
    next.forBId = rules.forBId;
    filled.push('a swap');
  }
  if (filled.length) run.add('guardrail', 'Filled gaps in the plan', `The AI left some slots empty, so the fair ranking filled ${filled.join(', ')}.`);
  return next;
}

/** A reason built only from Qloo evidence, used when the planner gave none. Never overstates. */
function jointReason(fit: PickFit | undefined, session: Session, tagLine?: string) {
  const [A, B] = session.people;
  const lean = tagLine ? ` You both lean ${tagLine}.` : '';
  // The ranks themselves are on the card, so the note says what they mean instead of repeating them.
  if (fit?.a && fit?.b) {
    const lowFor = fit.a.rank > fit.b.rank ? A.name : B.name;
    return fit.a.norm >= 2 / 3 && fit.b.norm >= 2 / 3 && topHalfForBoth(fit)
      ? `Qloo ranks this near the top for both of you.${lean}`
      : topHalfForBoth(fit)
      ? `A good fit for both of you on Qloo's ranks.${lean}`
      : `The most even option tonight, though it leans away from ${lowFor}'s taste.${lean}`;
  }
  return `Qloo found it from both your favourites together.${lean}`;
}

/** Put names back in. Also catches the model writing "A's" or "for B" without braces. */
export function fill(text: string, session: Session) {
  const [a, b] = [session.people[0].name, session.people[1].name];
  const nameOf = (x: string) => (x === 'A' ? a : b);
  return text
    .split('{A}')
    .join(a)
    .split('{B}')
    .join(b)
    .replace(/\b([AB]) and ([AB])\b/g, (_, x, y) => `${nameOf(x)} and ${nameOf(y)}`)
    .replace(/\b([AB])'s\b/g, (_, x) => `${nameOf(x)}'s`)
    .replace(/\b(for|to|with|from) ([AB])\b(?![\w'])/g, (_, w, x) => `${w} ${nameOf(x)}`);
}

export interface PlanOptions {
  /** Called as each agent step happens, so the browser can show real progress. */
  onStep?: (step: AgentTraceStep) => void;
  /** Qloo only, no AI planner (used to pre-warm the cache for the example pairs). */
  noLlm?: boolean;
}

export async function planNight(input: Session, opts: PlanOptions = {}): Promise<Session> {
  const session: Session = JSON.parse(JSON.stringify(input));
  const run = new Run(opts.onStep);
  const [A, B] = session.people;
  const notices: string[] = [];
  run.add('guardrail', 'Privacy', `Only favourites and Qloo ids go to Qloo. "${A.name}" and "${B.name}" stay in this app.`);

  if (!qlooKeyIsSet() && (await savedFixtureCount()) === 0) {
    run.add('guardrail', 'Qloo not connected', 'No QLOO_API_KEY and no saved Qloo responses. Nothing will be invented.');
  } else {
    await resolveFavourites(run, session);
  }

  const aSig = signalsOf(A);
  const bSig = signalsOf(B);
  const tagSig = { a: tagSignalsOf(A), b: tagSignalsOf(B) };
  const pools: Pools = { movies: [], tv: [], artists: [], aWorld: [], bWorld: [], local: [], sourceOf: new Map(), fit: new Map() };
  let tags: SharedTag[] = [];

  if (aSig.length && bSig.length) {
    const both = Array.from(new Set([...aSig, ...bSig]));
    const label = `both (${[...favNames(A), ...favNames(B)].slice(0, 4).join(' + ')})`;
    // Pipelined: each list is scored for both people as soon as Qloo returns it.
    const films = related(run, session, label, both, 'urn:entity:movie', 30, pools, { explain: true }).then((list) => {
      pools.movies = list;
      return scoreJobs(run, pools, [{ list, type: 'urn:entity:movie', who: ['a', 'b'] }], aSig, bSig, tagSig);
    });
    const shows = related(run, session, label, both, 'urn:entity:tv_show', 10, pools, { explain: true }).then((list) => {
      pools.tv = list;
      return scoreJobs(run, pools, [{ list, type: 'urn:entity:tv_show', who: ['a', 'b'] }], aSig, bSig, tagSig);
    });
    const music = Promise.all([
      related(run, session, label, both, 'urn:entity:artist', 12, pools, { explain: true }),
      related(run, session, `${A.name}'s side`, aSig, 'urn:entity:artist', 8, pools),
      related(run, session, `${B.name}'s side`, bSig, 'urn:entity:artist', 8, pools)
    ]).then(([artists, aWorld, bWorld]) => {
      // Keep each person's side distinct from the joint list, so swaps add something new.
      const joint = new Set(artists.map((e) => e.id));
      Object.assign(pools, { artists, aWorld: aWorld.filter((e) => !joint.has(e.id)), bWorld: bWorld.filter((e) => !joint.has(e.id)) });
      return scoreJobs(
        run,
        pools,
        [
          { list: pools.artists, type: 'urn:entity:artist', who: ['a', 'b'] },
          { list: pools.bWorld, type: 'urn:entity:artist', who: ['a'] },
          { list: pools.aWorld, type: 'urn:entity:artist', who: ['b'] }
        ],
        aSig,
        bSig,
        tagSig
      );
    });
    // South African artists for both tastes: Qloo's South Africa music tag on the joint signal.
    const local = session.includeLocal
      ? related(run, session, `${label}, South African artists`, both, 'urn:entity:artist', 12, pools, { tags: SA_MUSIC_TAG }).then((list) => {
          pools.local = list;
          return scoreJobs(run, pools, [{ list, type: 'urn:entity:artist', who: ['a', 'b'] }], aSig, bSig, tagSig);
        })
      : Promise.resolve({ calls: 0, scored: 0 });
    const [cmp, ...counts] = await Promise.all([qlooCompare(aSig, bSig, 12), films, shows, music, local]);
    run.note(cmp.source, cmp.capturedAt, cmp.error);
    run.add('tool_call', 'qloo_compare', `qloo_compare(a=${A.name}'s favourites, b=${B.name}'s favourites)`);
    tags = verifyTags(session, cmp.data);
    run.add(
      'tool_result',
      'qloo_compare result',
      cmp.source === 'unavailable'
        ? `No answer: ${cmp.error || 'unavailable'}.`
        : `${cmp.data.length} shared tags [${tag(cmp.source, cmp.capturedAt)}]; ${tags.filter((t) => t.confirmed).length} confirmed on both people's own favourites: ${tags.map((t) => `${t.name}${t.confirmed ? '' : ' (unconfirmed)'}`).join(', ') || 'none'}.`
    );
    finishScoring(run, pools, aSig, bSig, counts.reduce((t, c) => ({ calls: t.calls + c.calls, scored: t.scored + c.scored }), { calls: 0, scored: 0 }));
  } else if (qlooKeyIsSet() || (await savedFixtureCount()) > 0) {
    const busy = session.people.some((p) => p.favourites.some((f) => !f.qlooEntityId && !f.unmatched));
    run.add('guardrail', 'Not enough to compare', busy ? 'Qloo did not answer for some favourites.' : 'Each person needs at least one favourite that Qloo recognises.');
    notices.push(
      busy
        ? 'Qloo was busy and couldn’t look up all your favourites. Please try again in a moment.'
        : 'Each of you needs at least one favourite that Qloo recognises. Try a well-known artist, film or show.'
    );
  }

  let choice: Choice = rulesChoice(session, pools);
  let planner: 'llm' | 'rules' = 'rules';
  const havePools = pools.movies.length + pools.tv.length + pools.artists.length > 0;
  if (havePools && llmIsConfigured() && !opts.noLlm) {
    try {
      choice = fillGaps(run, critic(run, session, pools, await llmChoice(run, session, pools, tags)), rulesChoice(session, pools));
      planner = 'llm';
    } catch (err: any) {
      const msg = String(err?.message || err).slice(0, 160);
      notices.push(/503|429|timed out|high demand/i.test(msg) ? 'The AI planner was busy, so fixed rules picked tonight’s plan from the same Qloo results.' : 'The AI planner failed, so fixed rules picked tonight’s plan from the same Qloo results. Details are in the agent steps below.');
      run.add('guardrail', 'LLM agent failed', `${msg}. Falling back to rules.`);
      choice = rulesChoice(session, pools);
    }
  } else if (havePools) {
    notices.push('Picked by fixed rules. Add GEMINI_API_KEY to let the agent choose and explain.');
  }

  const status = run.status();
  if (status === 'not_connected') notices.unshift("Qloo isn't connected yet, so there's no plan. Nothing is invented in the meantime.");
  if (status === 'saved') notices.unshift(`Using real Qloo responses saved from earlier live calls (${run.savedDates.sort().slice(-1)[0]?.slice(0, 10) || 'earlier'}).`);
  if (status === 'error') notices.unshift(`Qloo didn't answer (${(run.errors[0] || 'unknown error').slice(0, 140)}).`);

  const all = new Map<string, QlooEntity>();
  for (const e of [...pools.movies, ...pools.tv, ...pools.artists, ...pools.aWorld, ...pools.bWorld, ...pools.local]) all.set(e.id, e);
  const tagLine = tags.filter((t) => t.confirmed).slice(0, 2).map((t) => t.name).join(' and ');
  // For a shared pick that is in the bottom half for one person, the AI's note can't claim it
  // suits both, so the evidence-only reason is used instead and the trace says so.
  let overruled = 0;
  const reasonFor = (id: string, fallback: string, shared = false) => {
    if (!choice.reasons[id]) return fallback;
    const fit = pools.fit.get(id);
    if (shared && fit?.a && fit?.b && !topHalfForBoth(fit)) {
      overruled++;
      return fallback;
    }
    return fill(choice.reasons[id], session);
  };
  const mk = (id: string | undefined, kind: PickKind, forWhom: 'both' | PersonId, fallback: string) => {
    const e = id ? all.get(id) : undefined;
    return e ? toPick(e, kind, forWhom, reasonFor(e.id, fallback, forWhom === 'both'), pools) : undefined;
  };

  const watch = mk(choice.watchId, 'watch', 'both', jointReason(pools.fit.get(choice.watchId || ''), session, tagLine));
  const alsoWatch = choice.alsoIds.map((id) => mk(id, 'also', 'both', jointReason(pools.fit.get(id), session))).filter(Boolean) as Pick[];
  const listen = choice.listenIds.map((id) => mk(id, 'listen', 'both', jointReason(pools.fit.get(id), session))).filter(Boolean) as Pick[];
  const forA = mk(choice.forAId, 'swap', 'b', `From ${B.name}'s side: people who like ${favNames(B)[0] || 'their favourites'} also like this. For ${A.name} to try.`);
  const forB = mk(choice.forBId, 'swap', 'a', `From ${A.name}'s side: people who like ${favNames(A)[0] || 'their favourites'} also like this. For ${B.name} to try.`);

  if (overruled)
    run.add('guardrail', 'Kept the notes honest', `${overruled} of the AI's notes described a pick as suiting you both when it is in the bottom half for one of you, so they were replaced with Qloo's ranks.`);

  // South African picks: fairest for both, not already in tonight's plan.
  const used = new Set([watch, ...alsoWatch, ...listen, forA, forB].filter(Boolean).map((p) => p!.qlooEntityId));
  const localPicks = byFairness(pools.local, pools)
    .filter((e) => !used.has(e.id))
    .slice(0, 3)
    .map((e) => toPick(e, 'local', 'both', jointReason(pools.fit.get(e.id), session), pools));
  if (session.includeLocal) {
    run.add(
      'guardrail',
      'South African picks',
      localPicks.length
        ? `${localPicks.length} South African artists ranked fairly for both of you (Qloo's South Africa music tag): ${localPicks.map((p) => p.name).join(', ')}.`
        : "Qloo had no South African artists for this pair's overlap."
    );
  }
  const why =
    choice.why && choice.why.length
      ? choice.why.map((w) => fill(w, session))
      : [
          tags.length
            ? tags.some((t) => t.confirmed)
              ? `Qloo says you both lean ${tags.filter((t) => t.confirmed).slice(0, 3).map((t) => t.name).join(', ')}.`
              : `Qloo's closest overlap: ${tags.slice(0, 3).map((t) => t.name).join(', ')} (not confirmed on both your favourites).`
            : 'Qloo had no shared tags for these favourites.',
          watch ? `${watch.name} came from both your tastes together, not just one side.` : 'Nothing to watch passed the filters this time.',
          forA || forB ? 'The swaps let each of you share a little of your own world.' : 'No swaps this time.'
        ];
  const tonight = choice.tonight
    ? fill(choice.tonight, session)
    : watch
    ? `${session.minutes} minutes: watch ${watch.name}${listen[0] ? `, then put on ${listen[0].name}` : ''}${forA && forB ? `, and swap: ${A.name} tries ${forA.name}, ${B.name} tries ${forB.name}` : ''}.`
    : 'Not enough to plan tonight. Add another favourite each and try again.';

  const picks = [watch, ...alsoWatch, ...listen, forA, forB, ...localPicks].filter(Boolean) as Pick[];
  run.add('synthesis', planner === 'llm' ? `Plan chosen by ${choice.model || 'the AI planner'}` : 'Plan chosen by rules', picks.length ? picks.map((p) => `${p.name} (${p.kind})`).join(', ') : 'No picks.');

  const plan: Plan = {
    id: `plan-${Date.now()}`,
    number: session.plans.length + 1,
    createdAt: new Date().toISOString(),
    minutes: session.minutes,
    commonGround: tags,
    watch,
    alsoWatch,
    listen,
    swap: { forA, forB },
    local: localPicks,
    why,
    tonight,
    trace: run.trace,
    planner,
    plannerModel: planner === 'llm' ? choice.model : undefined,
    qlooStatus: status,
    notices
  };
  session.plans = [plan, ...session.plans];
  session.seen = Array.from(new Set([...session.seen, ...picks.map((p) => p.qlooEntityId)]));
  return session;
}
