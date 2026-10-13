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
import { qlooCompare, qlooKeyIsSet, qlooRelated, qlooSearch, savedFixtureCount } from '../qloo-client';
import { extractJson, FunctionDeclaration, GeminiContent, GeminiPart, geminiGenerate, llmIsConfigured, modelOf } from '../llm';
import type { Favourite, Person, PersonId, Pick, PickKind, Plan, Session, SharedTag } from './types';

type Source = 'live' | 'saved' | 'unavailable';

const MAX_SIGNALS = 6;
const MAX_EXTRA_TOOL_CALLS = 3;

function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function namesMatch(a: string, b: string): boolean {
  const x = fold(a);
  const y = fold(b);
  return x === y || (x.length >= 4 && y.includes(x)) || (y.length >= 4 && x.includes(y));
}

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
  deadline = Date.now() + 40000;

  add(type: AgentTraceStep['type'], action: string, details: string) {
    this.trace.push({ step: this.trace.length + 1, type, action, details });
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
  results.forEach((res, i) => {
    const fav = jobs[i].fav;
    run.note(res.source, res.capturedAt, res.error);
    const match = res.data.find((e) => namesMatch(e.name, fav.query));
    run.add('tool_call', 'qloo_search', `qloo_search(query="${fav.query}", type="${fav.type}")`);
    if (res.source === 'unavailable') {
      run.add('tool_result', 'qloo_search result', `No answer: ${res.error || 'unavailable'}.`);
      return;
    }
    if (match) {
      fav.qlooEntityId = match.id;
      fav.qlooName = match.name;
      fav.image = match.image;
      fav.tags = match.tags;
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
  sourceOf: Map<string, { source: Source; capturedAt?: string }>;
}

async function related(run: Run, session: Session, label: string, ids: string[], type: string, take: number, pools: Pools) {
  const res = await qlooRelated(ids.join(','), type, { take });
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

/** Joint artists ordered so neither person's taste drowns out the other's:
 * first those Qloo also returns from each person's side alone, alternating sides, then the rest. */
function balancedListen(pools: Pools): QlooEntity[] {
  const inA = new Set(pools.aWorld.map((e) => e.id));
  const inB = new Set(pools.bWorld.map((e) => e.id));
  const both = pools.artists.filter((e) => inA.has(e.id) && inB.has(e.id));
  const aOnly = pools.artists.filter((e) => inA.has(e.id) && !inB.has(e.id));
  const bOnly = pools.artists.filter((e) => inB.has(e.id) && !inA.has(e.id));
  const out: QlooEntity[] = [...both];
  for (let i = 0; i < Math.max(aOnly.length, bOnly.length); i++) {
    if (aOnly[i]) out.push(aOnly[i]);
    if (bOnly[i]) out.push(bOnly[i]);
  }
  for (const e of pools.artists) if (!out.includes(e)) out.push(e);
  return out;
}

function rulesChoice(session: Session, pools: Pools): Choice {
  const short = session.minutes <= 60;
  const first = short ? pools.tv : pools.movies;
  const second = short ? pools.movies : pools.tv;
  const watch = first[0] || second[0];
  const also = [second.find((e) => e.id !== watch?.id), first.find((e, i) => i > 0 && e.id !== watch?.id)].filter(Boolean) as QlooEntity[];
  const listen = balancedListen(pools).slice(0, 3);
  const used = new Set([...listen.map((l) => l.id)]);
  const forB = pools.aWorld.find((e) => !used.has(e.id));
  if (forB) used.add(forB.id);
  const forA = pools.bWorld.find((e) => !used.has(e.id));
  return {
    watchId: watch?.id,
    alsoIds: also.slice(0, 2).map((e) => e.id),
    listenIds: listen.map((e) => e.id),
    forAId: forA?.id,
    forBId: forB?.id,
    reasons: {}
  };
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
- up to two alternatives to watch
- up to three artists to listen to together, balanced so each person hears something close to their own taste
- one artist from {A}'s side for {B} to try, and one from {B}'s side for {A}
You may call qloo_related at most ${MAX_EXTRA_TOOL_CALLS} times to explore further.
Then reply with ONE JSON object and nothing else:
{"watch_id": "...", "also_ids": ["..."], "listen_ids": ["..."], "for_a_id": "...", "for_b_id": "...",
 "reasons": {"<id>": "one short reason tied to the shared tags or favourites"},
 "why": ["three short reasons for this plan"], "tonight": "one or two sentences: how to spend the time"}
Only use ids that appear in the brief or in tool results. Never invent titles, facts or connections. Keep it warm and brief.`;

async function llmChoice(run: Run, session: Session, pools: Pools, tags: SharedTag[]): Promise<Choice> {
  const [A, B] = session.people;
  const list = (es: QlooEntity[]) => es.map((e) => `  - id "${e.id}": ${e.name}${e.year ? ` (${e.year})` : e.activeFrom ? ` (from ${e.activeFrom})` : ''}${e.contentRating ? `, ${e.contentRating}` : ''}`).join('\n') || '  - none';
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
Artists from {A}'s side (candidates for {B} to try):
${list(pools.aWorld)}
Artists from {B}'s side (candidates for {A} to try):
${list(pools.bWorld)}`;

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

function fill(text: string, session: Session) {
  return text.split('{A}').join(session.people[0].name).split('{B}').join(session.people[1].name);
}

export async function planNight(input: Session): Promise<Session> {
  const session: Session = JSON.parse(JSON.stringify(input));
  const run = new Run();
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
  const pools: Pools = { movies: [], tv: [], artists: [], aWorld: [], bWorld: [], sourceOf: new Map() };
  let tags: SharedTag[] = [];

  if (aSig.length && bSig.length) {
    const both = Array.from(new Set([...aSig, ...bSig]));
    const label = `both (${[...favNames(A), ...favNames(B)].slice(0, 4).join(' + ')})`;
    const [cmp, movies, tv, artists, aWorld, bWorld] = await Promise.all([
      qlooCompare(aSig, bSig, 12),
      related(run, session, label, both, 'urn:entity:movie', 10, pools),
      related(run, session, label, both, 'urn:entity:tv_show', 8, pools),
      related(run, session, label, both, 'urn:entity:artist', 10, pools),
      related(run, session, `${A.name}'s side`, aSig, 'urn:entity:artist', 8, pools),
      related(run, session, `${B.name}'s side`, bSig, 'urn:entity:artist', 8, pools)
    ]);
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
    // Keep each person's side distinct from the joint list, so swaps add something new.
    const joint = new Set(artists.map((e) => e.id));
    Object.assign(pools, { movies, tv, artists, aWorld: aWorld.filter((e) => !joint.has(e.id)), bWorld: bWorld.filter((e) => !joint.has(e.id)) });
  } else if (qlooKeyIsSet() || (await savedFixtureCount()) > 0) {
    run.add('guardrail', 'Not enough to compare', 'Each person needs at least one favourite that Qloo recognises.');
    notices.push('Each of you needs at least one favourite that Qloo recognises. Try a well-known artist, film or show.');
  }

  let choice: Choice = rulesChoice(session, pools);
  let planner: 'llm' | 'rules' = 'rules';
  const havePools = pools.movies.length + pools.tv.length + pools.artists.length > 0;
  if (havePools && llmIsConfigured()) {
    try {
      choice = await llmChoice(run, session, pools, tags);
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
  for (const e of [...pools.movies, ...pools.tv, ...pools.artists, ...pools.aWorld, ...pools.bWorld]) all.set(e.id, e);
  const tagLine = tags.filter((t) => t.confirmed).slice(0, 2).map((t) => t.name).join(' and ');
  const bothLabel = `${A.name} and ${B.name}`;
  const reasonFor = (id: string, fallback: string) => (choice.reasons[id] ? fill(choice.reasons[id], session) : fallback);
  const mk = (id: string | undefined, kind: PickKind, forWhom: 'both' | PersonId, fallback: string) => {
    const e = id ? all.get(id) : undefined;
    return e ? toPick(e, kind, forWhom, reasonFor(e.id, fallback), pools) : undefined;
  };

  const watch = mk(choice.watchId, 'watch', 'both', `Qloo found it from both your favourites together${tagLine ? `; you both lean ${tagLine}` : ''}.`);
  const alsoWatch = choice.alsoIds.map((id) => mk(id, 'also', 'both', 'Another one from both your tastes together.')).filter(Boolean) as Pick[];
  const listen = choice.listenIds.map((id) => mk(id, 'listen', 'both', `From ${bothLabel}'s tastes together.`)).filter(Boolean) as Pick[];
  const forA = mk(choice.forAId, 'swap', 'b', `From ${B.name}'s side: people who like ${favNames(B)[0] || 'their favourites'} also like this. For ${A.name} to try.`);
  const forB = mk(choice.forBId, 'swap', 'a', `From ${A.name}'s side: people who like ${favNames(A)[0] || 'their favourites'} also like this. For ${B.name} to try.`);

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

  const picks = [watch, ...alsoWatch, ...listen, forA, forB].filter(Boolean) as Pick[];
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
