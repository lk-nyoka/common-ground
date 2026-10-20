/**
 * Gentle visit planning agent (server-side only). Gentle visit began as "Back Then" during this hackathon.
 *
 * With GEMINI_API_KEY set, an LLM plans the visit by calling Qloo tools itself
 * (qloo_related, qloo_search), then chooses the kit and explains it. Without it, a
 * rule-based planner calls the same tools in a fixed order. Either way:
 * - every trace step below records a call that actually happened, with its real result;
 * - every new item comes from a Qloo response (live or captured), never from the model;
 * - the person's name and birth year are never sent to Qloo or to the LLM.
 */
import {
  AgentTraceStep,
  CaregiverProfile,
  QlooEntity,
  QlooStatus,
  TasteEntity,
  VisitKit
} from './types';
import { qlooKeyIsSet, qlooRelated, qlooSearch, savedFixtureCount } from './qloo-client';
import { assembleKit, domainFromQlooType, domainsToRest, isAvoided, mediaLinkFor, shortName, tally, DOMAIN_LABEL } from './care-logic';
import { extractJson, FunctionDeclaration, GeminiContent, GeminiPart, geminiGenerate, llmIsConfigured, llmModel } from './llm';

const MAX_TOOL_CALLS = 6;
const MAX_NEW_NODES = 6;
const TARGET_TYPES = ['urn:entity:artist', 'urn:entity:movie', 'urn:entity:tv_show'];

type Source = 'live' | 'saved' | 'unavailable';

function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function namesMatch(a: string, b: string): boolean {
  const x = norm(a);
  const y = norm(b);
  return x === y || (x.length >= 4 && y.includes(x)) || (y.length >= 4 && x.includes(y));
}

class PlanState {
  profile: CaregiverProfile;
  trace: AgentTraceStep[] = [];
  sources: Source[] = [];
  errors: string[] = [];
  candidates = new Map<string, TasteEntity>(); // node id -> node
  toolCalls = 0; // calls the LLM (or rules) chose; seed lookups don't count
  qlooDown = false;
  /** Finish planning well inside Vercel's 60-second limit. */
  deadline = Date.now() + 40000;
  savedDates: string[] = [];
  /** Entities the agent may expand from: things that reached them, plus agent-searched ones. */
  signals = new Map<string, { name: string; type?: string; origin: 'family' | 'discovered' | 'searched' }>();

  constructor(profile: CaregiverProfile) {
    this.profile = {
      ...profile,
      tasteMapNodes: profile.tasteMapNodes.map((n) => ({ ...n })),
      avoidList: [...profile.avoidList]
    };
  }

  add(type: AgentTraceStep['type'], action: string, details: string) {
    this.trace.push({ step: this.trace.length + 1, type, action, details });
  }

  noteSource(source: Source, capturedAt?: string, error?: string) {
    this.sources.push(source);
    if (capturedAt) this.savedDates.push(capturedAt);
    if (error && source === 'unavailable') this.errors.push(error);
  }

  qlooStatus(): QlooStatus {
    if (this.sources.includes('live')) return 'live';
    if (this.sources.includes('saved')) return 'saved';
    if (qlooKeyIsSet() && this.errors.length) return 'error';
    return 'not_connected';
  }
}

function sourceTag(source: Source, capturedAt?: string): string {
  if (source === 'live') return 'Qloo live';
  if (source === 'saved') return `saved Qloo response${capturedAt ? ` from ${capturedAt.slice(0, 10)}` : ''}`;
  return 'unavailable';
}

/** Turn a Qloo entity into an untested map node, or explain why it was dropped. */
function considerEntity(
  st: PlanState,
  e: QlooEntity,
  seedName: string,
  source: Source,
  capturedAt?: string
): { node?: TasteEntity; dropped?: string } {
  const p = st.profile;
  if (isAvoided(p, e.name, e.id)) return { dropped: 'on the avoid list' };
  if (e.year && e.year > p.eraEnd) return { dropped: `after ${p.eraEnd}` };
  if (e.activeFrom && e.activeFrom > p.eraEnd) return { dropped: `started in ${e.activeFrom}, after ${p.eraEnd}` };
  if (p.tasteMapNodes.some((n) => n.qlooEntityId === e.id || namesMatch(n.name, e.name))) return { dropped: 'already on the map' };
  const domain = domainFromQlooType(e.type);
  const node: TasteEntity = {
    id: `qloo-${e.id}`,
    name: e.name,
    domain,
    year: e.year,
    activeFrom: e.activeFrom,
    sourceSeed: seedName,
    sourceReason: `Qloo: people with an affinity for ${seedName} also tend to like this${
      typeof e.affinity === 'number' ? ` (affinity ${e.affinity.toFixed(2)})` : ''
    }.`,
    status: 'untested',
    confidence: 'Medium',
    confidenceReason: `Discovered by Qloo from ${seedName}; not yet tried`,
    provenance: source === 'live' ? 'qloo_live' : 'qloo_saved',
    capturedAt: source === 'saved' ? capturedAt : undefined,
    qlooEntityId: e.id,
    qlooEntityType: e.type,
    mediaLink: mediaLinkFor(e.name, domain)
  };
  return { node };
}

async function runSearch(st: PlanState, query: string, type?: string, countIt = true) {
  if (countIt) st.toolCalls++;
  const res = await qlooSearch(query, type, 5);
  // Call and result are recorded together, so parallel calls stay paired in the trace.
  st.add('tool_call', 'qloo_search', `qloo_search(query="${query}"${type ? `, type="${type}"` : ''})`);
  st.noteSource(res.source, res.capturedAt, res.error);
  if (res.source === 'unavailable') {
    st.add('tool_result', 'qloo_search result', `No answer: ${res.error || 'unavailable'}.`);
  } else {
    st.add(
      'tool_result',
      'qloo_search result',
      `${res.data.length} match(es) [${sourceTag(res.source, res.capturedAt)}]: ${res.data
        .slice(0, 3)
        .map((e) => `"${e.name}" (${e.type}${e.year ? `, ${e.year}` : ''})`)
        .join(', ') || 'none'}.`
    );
  }
  return res;
}

async function runRelated(st: PlanState, entityId: string, targetType: string) {
  const signal = st.signals.get(entityId);
  const seedName = signal?.name || entityId;
  st.toolCalls++;
  const res = await qlooRelated(entityId, targetType, { take: 8, maxYear: st.profile.eraEnd });
  st.add('tool_call', 'qloo_related', `qloo_related(from="${seedName}", target_type="${targetType}")`);
  st.noteSource(res.source, res.capturedAt, res.error);
  if (res.source === 'unavailable') {
    st.add('tool_result', 'qloo_related result', `No answer: ${res.error || 'unavailable'}.`);
    return { kept: [] as TasteEntity[], returned: [] as QlooEntity[], dropped: [] as string[] };
  }
  const kept: TasteEntity[] = [];
  const dropped: string[] = [];
  for (const e of res.data) {
    const { node, dropped: why } = considerEntity(st, e, seedName, res.source, res.capturedAt);
    if (node) {
      if (!st.candidates.has(node.id)) st.candidates.set(node.id, node);
      kept.push(node);
    } else if (why) {
      dropped.push(`${e.name} (${why})`);
    }
  }
  st.add(
    'tool_result',
    'qloo_related result',
    `${res.data.length} returned [${sourceTag(res.source, res.capturedAt)}]${
      res.yearFilterApplied ? `, asked Qloo for release years up to ${st.profile.eraEnd}` : ''
    }; kept ${kept.length}${kept.length ? `: ${kept.slice(0, 5).map((k) => `${k.name}${k.year ? ` (${k.year})` : k.activeFrom ? ` (from ${k.activeFrom})` : ''}`).join(', ')}` : ''}${
      dropped.length ? `; dropped ${dropped.length}: ${dropped.slice(0, 4).join(', ')}` : ''
    }.`
  );
  return { kept, returned: res.data, dropped };
}

/** Step 1: match family seeds to Qloo entities so they can be expanded. */
async function resolveSeeds(st: PlanState) {
  const unresolved = st.profile.tasteMapNodes.filter((n) => n.provenance === 'family' && n.qlooQuery && !n.qlooEntityId && n.status !== 'avoid');
  // Look all seeds up at once.
  const results = await Promise.all(unresolved.map((node) => runSearch(st, node.qlooQuery!.query, node.qlooQuery!.type || undefined, false)));
  for (let i = 0; i < unresolved.length; i++) {
    const node = unresolved[i];
    const res = results[i];
    if (res.source === 'unavailable') continue;
    const match = res.data.find((e) => namesMatch(e.name, node.qlooQuery!.query));
    if (match) {
      node.qlooEntityId = match.id;
      node.qlooEntityType = match.type;
      if (!node.year && match.year && node.domain !== 'music') node.year = match.year;
      node.sourceReason = `Family memory, matched in Qloo as "${match.name}" (${match.type}).`;
    } else {
      st.add('guardrail', 'No confident match', `Kept "${node.name}" as a family memory only: no Qloo result matched the name closely.`);
    }
  }
}

function collectSignals(st: PlanState) {
  const nodes = st.profile.tasteMapNodes.filter((n) => n.qlooEntityId && n.status === 'worked');
  // Items discovered earlier that lit up come first: liked items become new seeds.
  const ordered = [...nodes.filter((n) => n.provenance !== 'family'), ...nodes.filter((n) => n.provenance === 'family')];
  for (const n of ordered) {
    st.signals.set(n.qlooEntityId!, { name: shortName(n.name), type: n.qlooEntityType, origin: n.provenance === 'family' ? 'family' : 'discovered' });
  }
}

/** Rule-based planner: expand up to three signals into music and (unless resting) film. */
async function rulesExpand(st: PlanState) {
  const rest = domainsToRest(st.profile.domainStats);
  const targets = TARGET_TYPES.filter((t) => !rest.includes(domainFromQlooType(t))).slice(0, 2);
  const jobs: Array<[string, string]> = [];
  for (const [entityId] of Array.from(st.signals.entries()).slice(0, 3)) {
    for (const t of targets) jobs.push([entityId, t]);
  }
  const budget = Math.max(0, MAX_TOOL_CALLS - st.toolCalls);
  if (budget === 0 || Date.now() > st.deadline) return;
  // Independent lookups, so run them in parallel.
  await Promise.all(jobs.slice(0, budget).map(([id, t]) => runRelated(st, id, t)));
}

function existingUntested(st: PlanState): TasteEntity[] {
  const lastVisit = st.profile.visitHistory.length;
  return st.profile.tasteMapNodes.filter(
    (n) =>
      n.status === 'untested' &&
      n.provenance !== 'family' &&
      !isAvoided(st.profile, n.name, n.qlooEntityId) &&
      !(n.year && n.year > st.profile.eraEnd) &&
      !(n.lastTriedVisit && n.lastTriedVisit >= lastVisit) // fell flat last visit: rest it
  );
}

const TOOLS: FunctionDeclaration[] = [
  {
    name: 'qloo_related',
    description:
      "Ask Qloo's taste graph which entities of target_type people with an affinity for entity_id also like. Returns candidates with ids you can pick for the kit. Films/TV are capped to the person's era; artists who started after the era are removed.",
    parameters: {
      type: 'OBJECT',
      properties: {
        entity_id: { type: 'STRING', description: 'A Qloo entity_id from the signals list or from a qloo_search result.' },
        target_type: { type: 'STRING', description: 'Entity type to return.', enum: TARGET_TYPES }
      },
      required: ['entity_id', 'target_type']
    }
  },
  {
    name: 'qloo_search',
    description:
      'Look up a cultural entity in Qloo by name, e.g. to find a family memory that has no Qloo id yet. Results can be used as entity_id in qloo_related.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Name to search for.' },
        type: { type: 'STRING', description: 'Optional Qloo entity type, e.g. urn:entity:artist.' }
      },
      required: ['query']
    }
  }
];

function profileSummaryForLlm(st: PlanState): string {
  const p = st.profile;
  const fam = p.tasteMapNodes
    .filter((n) => n.provenance === 'family')
    .map((n) => `- ${n.name} (${n.domain}; status: ${n.status})`)
    .join('\n');
  const sig = Array.from(st.signals.entries())
    .map(([id, s]) => `- entity_id "${id}": ${s.name} (${s.type || 'type unknown'}; ${s.origin === 'family' ? 'family favourite' : 'discovered earlier and it lit them up'})`)
    .join('\n');
  const stats = (Object.keys(p.domainStats) as Array<keyof typeof p.domainStats>)
    .map((d) => {
      const t = tally(p.domainStats, d as any);
      return `- ${d}: tried ${t.tried}, lit up ${t.litUp}, upset ${t.upset}`;
    })
    .join('\n');
  const untested = existingUntested(st)
    .map((n) => `- id "${n.id}": ${n.name} (${n.domain}${n.year ? `, ${n.year}` : n.activeFrom ? `, active from ${n.activeFrom}` : ''}; from ${n.sourceSeed})`)
    .join('\n');
  const last = p.visitHistory[0];
  const lastLine = last?.reactedItems
    ? Object.entries(last.reactions)
        .map(([id, r]) => `${last.reactedItems?.[id]?.name || id}: ${r}`)
        .join(', ')
    : 'none';

  return `Plan visit number ${p.visitHistory.length + 1}.
Home region: ${p.homeRegion}
Youth era (ages about 12–30): ${p.eraStart}–${p.eraEnd}
Hobbies (from family): ${p.hobbies || 'not given'}
Family favourites:
${fam || '- none'}
Signals you may expand with qloo_related:
${sig || '- none'}
Domain results so far:
${stats || '- no visits logged yet'}
Last visit reactions: ${lastLine}
Avoid list: ${p.avoidList.join('; ') || 'none'}
Untested Qloo discoveries already on the map (you may pick these too):
${untested || '- none'}`;
}

const SYSTEM = `You are the Gentle visit planning agent. You help a family plan a short (about 20 minute) visit with an older relative living with dementia. You do not know the person's name; write {name} wherever you would address or mention them.

Your job:
1. Use the tools to find culturally connected items with Qloo. Expand from the signals that have reached them. Lean toward domains that have worked; do not experiment in a domain that caused upset and never lit up.
2. Keep to their youth era. Films and TV come with release years; artists come with the year they started (anyone who started after the era is already dropped). An artist who started earlier may still be best known for later work: use your knowledge to reject any whose fame clearly comes after the era.
3. Make at most ${MAX_TOOL_CALLS} tool calls in total.
4. Then reply with ONE JSON object and nothing else:
{
  "discovery_ids": ["1 or 2 candidate ids"],
  "hypothesis_id": "one candidate id, ideally a different domain or a further link",
  "hypothesis_tests": "Testing: does {name} respond to ...?",
  "rejected": [{"id": "candidate id", "reason": "short reason, e.g. active only after 1990"}],
  "why_this_kit": ["three short reasons, each true of this kit"],
  "openers": ["three short, gentle conversation openers using {name}"],
  "shared_moment": {"title": "...", "description": "...", "action_prompt": "..."}
}
Only pick ids that appeared in tool results or in the untested list. Only mention items that are in the kit or the family favourites. Never invent facts about the person or their life. No medical claims.`;

async function llmPlan(st: PlanState): Promise<{
  picks?: { discoveryIds: string[]; hypothesisId?: string; hypothesisTests?: string };
  writing?: { why?: string[]; openers?: string[]; sharedMoment?: { title: string; description: string; actionPrompt: string } };
}> {
  const model = llmModel();
  st.add(
    'thought',
    'Agent briefed',
    `${model} receives the era range, region, hobbies, family favourites, past reactions and the avoid list. It does not receive the name or birth year.`
  );
  const contents: GeminiContent[] = [{ role: 'user', parts: [{ text: profileSummaryForLlm(st) }] }];
  let finalText = '';

  for (let turn = 0; turn < 6; turn++) {
    const remaining = st.deadline - Date.now();
    if (remaining < 8000) break; // leave time for the final plan
    const allowTools = st.toolCalls < MAX_TOOL_CALLS && remaining > 15000;
    const reply = await geminiGenerate({ system: SYSTEM, contents, tools: TOOLS, allowTools, timeoutMs: Math.min(20000, remaining - 3000) });
    contents.push(reply);
    const calls = reply.parts.filter((p) => p.functionCall);
    const text = reply.parts.map((p) => p.text || '').join('').trim();
    if (calls.length === 0) {
      finalText = text;
      break;
    }
    // Run this turn's tool calls in parallel; responses keep the model's order.
    let reserved = st.toolCalls;
    const responses: GeminiPart[] = await Promise.all(calls.map(async (part): Promise<GeminiPart> => {
      const fc = part.functionCall!;
      let result: Record<string, unknown>;
      const overLimit = reserved >= MAX_TOOL_CALLS;
      reserved++;
      if (overLimit) {
        result = { error: 'Tool call limit reached. Reply with the JSON plan now.' };
      } else if (fc.name === 'qloo_related') {
        const entityId = String(fc.args.entity_id || '');
        const targetType = String(fc.args.target_type || '');
        if (!st.signals.has(entityId)) {
          st.add('guardrail', 'Refused a tool call', `The model asked for qloo_related on "${entityId}", which is not a known Qloo id. Refused and told it to use a real one.`);
          result = { error: 'Unknown entity_id. Use one from the signals list or a qloo_search result.' };
        } else if (!TARGET_TYPES.includes(targetType)) {
          result = { error: `target_type must be one of ${TARGET_TYPES.join(', ')}` };
        } else {
          const r = await runRelated(st, entityId, targetType);
          result = {
            candidates: r.kept.map((k) => ({ id: k.id, name: k.name, type: k.qlooEntityType, year: k.year ?? null, active_from: k.activeFrom ?? null })),
            dropped_by_guardrails: r.dropped
          };
        }
      } else if (fc.name === 'qloo_search') {
        const query = String(fc.args.query || '');
        const type = fc.args.type ? String(fc.args.type) : undefined;
        const r = await runSearch(st, query, type);
        for (const e of r.data) {
          if (!st.signals.has(e.id) && !isAvoided(st.profile, e.name, e.id)) st.signals.set(e.id, { name: e.name, type: e.type, origin: 'searched' });
        }
        result = { results: r.data.map((e) => ({ entity_id: e.id, name: e.name, type: e.type, year: e.year ?? null })) };
      } else {
        result = { error: `Unknown tool ${fc.name}` };
      }
      return { functionResponse: { name: fc.name, response: result, ...(fc.id ? { id: fc.id } : {}) } };
    }));
    contents.push({ role: 'user', parts: responses });
  }

  let plan = extractJson(finalText);
  if (!plan) {
    contents.push({ role: 'user', parts: [{ text: 'Reply now with the JSON object only.' }] });
    const remaining = st.deadline + 12000 - Date.now();
    if (remaining < 4000) throw new Error('ran out of time before the model returned a plan');
    const reply = await geminiGenerate({ system: SYSTEM, contents, tools: TOOLS, allowTools: false, timeoutMs: Math.min(15000, remaining) });
    plan = extractJson(reply.parts.map((p) => p.text || '').join(''));
  }
  if (!plan) throw new Error('the model did not return a JSON plan');

  // Apply the agent's own rejections (e.g. an artist from the wrong era).
  const rejected = new Set<string>();
  if (Array.isArray(plan.rejected)) {
    for (const r of plan.rejected) {
      const id = String(r?.id || '');
      const node = st.candidates.get(id);
      if (node && st.candidates.delete(id)) {
        rejected.add(id);
        st.add('guardrail', 'Agent rejected a candidate', `${node.name}: ${String(r?.reason || 'no reason given')}.`);
      }
    }
  }

  const known = new Set([...Array.from(st.candidates.keys()), ...existingUntested(st).map((n) => n.id)]);
  const picked = [...(Array.isArray(plan.discovery_ids) ? plan.discovery_ids : []), plan.hypothesis_id].filter(Boolean).map(String);
  const discoveryIds = (Array.isArray(plan.discovery_ids) ? plan.discovery_ids : []).map(String).filter((id: string) => known.has(id));
  const hypothesisId = plan.hypothesis_id && known.has(String(plan.hypothesis_id)) ? String(plan.hypothesis_id) : undefined;
  const contradicted = picked.filter((id) => rejected.has(id));
  const unknown = picked.filter((id) => !known.has(id) && !rejected.has(id));
  if (contradicted.length) st.add('guardrail', 'Dropped self-contradicting picks', `The model both picked and rejected ${contradicted.length} item(s); they were left out.`);
  if (unknown.length) st.add('guardrail', 'Ignored invented picks', `The model picked ${unknown.length} id(s) that no Qloo call returned (${unknown.join(', ')}). They were ignored.`);

  const sm = plan.shared_moment;
  const strings = (a: any) => (Array.isArray(a) ? a.map(String).filter(Boolean) : undefined);
  return {
    picks: discoveryIds.length ? { discoveryIds, hypothesisId, hypothesisTests: plan.hypothesis_tests ? String(plan.hypothesis_tests) : undefined } : undefined,
    writing: {
      why: strings(plan.why_this_kit),
      openers: strings(plan.openers),
      sharedMoment:
        sm && sm.title && sm.description
          ? { title: String(sm.title), description: String(sm.description), actionPrompt: String(sm.action_prompt || sm.actionPrompt || '') }
          : undefined
    }
  };
}

function fillName<T>(value: T, name: string): T {
  if (typeof value === 'string') return value.split('{name}').join(name) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => fillName(v, name)) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = fillName(v, name);
    return out as T;
  }
  return value;
}

export async function planVisit(input: CaregiverProfile): Promise<{ profile: CaregiverProfile; kit: VisitKit }> {
  const st = new PlanState(input);
  const p = st.profile;
  const notices: string[] = [];

  st.add('guardrail', 'Privacy', `Only cultural names and Qloo ids go to Qloo. The name "${p.lovedOneName}" and the birth year stay in this app.`);

  const fixtures = await savedFixtureCount();
  if (!qlooKeyIsSet() && fixtures === 0) {
    st.qlooDown = true;
    st.add('guardrail', 'Qloo not connected', 'No QLOO_API_KEY and no saved Qloo responses, so no Qloo calls can be made. No discoveries will be invented.');
  }

  if (!st.qlooDown) await resolveSeeds(st);
  collectSignals(st);

  let planner: 'llm' | 'rules' = 'rules';
  let picks: Awaited<ReturnType<typeof llmPlan>>['picks'];
  let writing: Awaited<ReturnType<typeof llmPlan>>['writing'];

  if (!st.qlooDown && st.signals.size > 0) {
    if (llmIsConfigured()) {
      try {
        const out = await llmPlan(st);
        planner = 'llm';
        picks = out.picks;
        writing = out.writing;
      } catch (err: any) {
        const msg = err?.message || String(err);
        notices.push(`The LLM agent failed (${msg.slice(0, 160)}), so Gentle visit's rules planned this kit instead.`);
        st.add('guardrail', 'LLM agent failed', `${msg.slice(0, 200)}. Falling back to rules.`);
      }
    }
    if (planner === 'rules' && st.candidates.size < 3) await rulesExpand(st);
  } else if (!st.qlooDown) {
    st.add('guardrail', 'Nothing to expand', 'None of the family favourites matched a Qloo entity yet, so there is nothing to expand from.');
  }

  if (planner === 'rules' && !llmIsConfigured()) {
    notices.push('Planned by Gentle visit\'s rules. Add GEMINI_API_KEY to let the LLM agent choose and explain the kit.');
  }

  // Candidates: new Qloo results first, then earlier untested discoveries.
  const candidates = [...Array.from(st.candidates.values()), ...existingUntested(st).filter((n) => !st.candidates.has(n.id))];

  const status = st.qlooStatus();
  if (status === 'not_connected') {
    notices.unshift('Qloo isn\'t connected yet, so this kit uses family favourites only. Nothing has been invented to fill the gaps.');
  } else if (status === 'saved') {
    const date = st.savedDates.sort().slice(-1)[0];
    notices.unshift(`Using real Qloo responses saved from earlier live calls${date ? ` (captured ${date.slice(0, 10)})` : ''}.`);
  } else if (status === 'error') {
    notices.unshift(`Qloo didn't answer (${(st.errors[0] || 'unknown error').slice(0, 160)}). The kit uses what is already known.`);
  }
  if (candidates.some((c) => c.provenance !== 'family' && !c.year && !c.activeFrom)) {
    notices.push("Some discoveries have no year in Qloo, so their era couldn't be checked. They're marked \"Era not checked\".");
  }

  const kit = assembleKit({
    profile: p,
    candidates,
    picks,
    writing: writing ? fillName(writing, p.lovedOneName) : undefined,
    trace: st.trace,
    planner,
    plannerModel: planner === 'llm' ? llmModel() : undefined,
    qlooStatus: status,
    notices
  });
  if (kit.hypothesis?.hypothesisLabel) kit.hypothesis.hypothesisLabel = fillName(kit.hypothesis.hypothesisLabel, p.lovedOneName);

  // Add what the kit uses (and a few more discoveries) to the living map.
  const used = new Set([...kit.qlooDiscoveries, ...(kit.hypothesis ? [kit.hypothesis] : [])].map((k) => k.id));
  const newNodes = Array.from(st.candidates.values());
  const toAdd = [...newNodes.filter((n) => used.has(n.id)), ...newNodes.filter((n) => !used.has(n.id))].slice(0, MAX_NEW_NODES);
  p.tasteMapNodes = [...p.tasteMapNodes, ...toAdd.filter((n) => !p.tasteMapNodes.some((m) => m.id === n.id))];

  const chosen = [
    ...kit.qlooDiscoveries.map((d) => shortName(d.name)),
    ...(kit.hypothesis ? [`${shortName(kit.hypothesis.name)} (experiment)`] : [])
  ];
  st.add(
    'synthesis',
    planner === 'llm' ? `Kit chosen by ${llmModel()}` : 'Kit chosen by rules',
    `${kit.provenFavourites.length} proven, ${kit.qlooDiscoveries.length} Qloo discover${kit.qlooDiscoveries.length === 1 ? 'y' : 'ies'}${
      kit.hypothesis ? ', 1 experiment' : ''
    }${chosen.length ? `: ${chosen.join(', ')}` : ''}. ${domainsToRest(p.domainStats).length ? `Resting ${domainsToRest(p.domainStats).map((d) => DOMAIN_LABEL[d]).join(', ')}.` : ''}`.trim()
  );

  return { profile: { ...p, currentKit: kit }, kit };
}
