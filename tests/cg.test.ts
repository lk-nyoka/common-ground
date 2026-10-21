/**
 * Common Ground tests. Qloo and Gemini are mocked, so these run offline and never use real keys.
 * Run with: npm test
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { cleanSession, cleanVerdicts, InputError, trimForClient } from '../lib/cg/validate';
import { applyFeedback, picksOf, sharedHitRate } from '../lib/cg/learn';
import { fill, planNight, topHalfForBoth } from '../lib/cg/agent';
import { clearQlooCache } from '../lib/qloo-client';
import { decodeInvite, encodeInvite } from '../lib/cg/invite';
import { decodeResult, encodeResult, summarise as studySummary } from '../lib/cg/study';
import { fav, newSession, person } from '../lib/cg/samples';
import type { Session } from '../lib/cg/types';

// ---------- a fake Qloo + Gemini ----------

const ent = (id: string, name: string, type: string, tags: string[] = [], extra: Record<string, unknown> = {}) => ({
  entity_id: id,
  name,
  type: 'urn:entity',
  subtype: type,
  types: [type],
  tags: tags.map((t) => ({ name: t, id: `urn:tag:genre:${t.toLowerCase()}` })),
  properties: { image: { url: `https://img.example/${id}.jpg` }, ...extra }
});

const SEARCH: Record<string, any> = {
  metallica: ent('ART-MET', 'Metallica', 'urn:entity:artist', ['Energetic', 'Melodic', 'Rock']),
  'taylor swift': ent('ART-TS', 'Taylor Swift', 'urn:entity:artist', ['Melodic', 'Love', 'Pop'])
};

let calls: { url: string; body?: string }[] = [];
let lastPlaceQuery = '';

/** Per-person affinity the fake Qloo returns for filter.results.entities (signal -> id -> score). */
let AFF: Record<string, Record<string, number>> = {};
const DEFAULT_AFF = (): Record<string, Record<string, number>> => ({
  'ART-MET': { 'ART-SA1': 0.7, 'ART-SA2': 0.4, 'ART-SA3': 0.65, 'MOV-1': 0.95, 'MOV-3': 0.8, 'MOV-5': 0.85, 'TV-1': 0.7, 'ART-1': 0.6, 'ART-2': 0.95, 'ART-3': 0.5, 'ART-4': 0.9, 'ART-8': 0.7, 'ART-11': 0.3 },
  'ART-TS': { 'ART-SA1': 0.6, 'ART-SA2': 0.9, 'ART-SA3': 0.62, 'MOV-1': 0.4, 'MOV-3': 0.85, 'MOV-5': 0.7, 'TV-1': 0.75, 'ART-1': 0.9, 'ART-2': 0.4, 'ART-3': 0.95, 'ART-4': 0.45, 'ART-9': 0.65, 'ART-12': 0.2 }
});
let gemini: ((body: any) => any) | null = null;
const NO_SCORE = new Set<string>();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

function installFetch() {
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = String(input);
    calls.push({ url, body: init?.body });
    const u = new URL(url);
    if (u.hostname.includes('qloo')) {
      if (u.pathname === '/search') {
        const hit = SEARCH[(u.searchParams.get('query') || '').toLowerCase()];
        return json({ results: hit ? [hit] : [] });
      }
      if (u.pathname === '/v2/insights/compare') {
        return json({ results: { tags: [
          { name: 'Melodic', subtype: 'urn:tag:genre', query: { score: 0.9 } },
          { name: 'Blues', subtype: 'urn:tag:genre', query: { score: 0.8 } },
          { name: 'Energetic', subtype: 'urn:tag:audience', query: { score: 0.7 } }
        ] } });
      }
      if (u.pathname === '/v2/insights' && u.searchParams.get('filter.results.entities')) {
        const type = u.searchParams.get('filter.type') || '';
        const signal = u.searchParams.get('signal.interests.entities') || u.searchParams.get('signal.interests.tags') || '';
        const ids = (u.searchParams.get('filter.results.entities') || '').split(',');
        const table = AFF[signal] || {};
        // Like the real API: a signal with no cross-domain data returns the entities without affinity.
        if (NO_SCORE.has(`${signal}|${type}`)) return json({ success: true, results: { entities: ids.map((id) => ent(id, id, type)) } });
        return json({ success: true, results: { entities: ids.map((id) => ({ ...ent(id, id, type), query: { affinity: table[id] ?? 0.5 } })) } });
      }
      if (u.pathname === '/v2/insights' && u.searchParams.get('filter.tags') === 'urn:tag:genre:music:south_africa') {
        return json({ success: true, results: { entities: [ent('ART-SA1', 'Nasty C', 'urn:entity:artist', ['South Africa']), ent('ART-SA2', 'Tyla', 'urn:entity:artist', ['South Africa']), ent('ART-SA3', 'Master KG', 'urn:entity:artist', ['South Africa'])] } });
      }
      if (u.pathname === '/v2/insights' && u.searchParams.get('filter.type') === 'urn:entity:place') {
        lastPlaceQuery = u.searchParams.get('filter.location.query') || '';
        return json({ success: true, results: { entities: [{ ...ent('PLACE-1', 'Social On Main', 'urn:entity:place', ['Live music']), properties: { address: '1 Main Rd, Bryanston', website: 'https://example.com', images: [{ url: 'https://images.qloo.com/i/x.jpg' }] } }] } });
      }
      if (u.pathname === '/v2/insights') {
        const type = u.searchParams.get('filter.type') || '';
        const signal = u.searchParams.get('signal.interests.entities') || '';
        const explain = u.searchParams.get('feature.explainability') === 'true';
        const key = signal.includes(',') ? 'both' : signal;
        const list =
          type.includes('movie')
            ? [
                ent('MOV-1', 'Titanic', type, ['Drama'], { release_year: 1997, duration: 110 }),
                ent('MOV-2', 'The Haunting', type, ['Horror']),
                ent('MOV-3', 'Slumdog Millionaire', type, ['Drama'], { release_year: 2008, duration: 100 }),
                ent('MOV-4', 'A Very Long Epic', type, ['Drama'], { duration: 240 }),
                ent('MOV-5', 'Notting Hill', type, ['Romance'], { release_year: 1999, duration: 114 })
              ]
            : type.includes('tv')
            ? [ent('TV-1', 'The Red Road', type, ['Drama'])]
            : key === 'both'
            ? [ent('ART-1', 'Coldplay', type), ent('ART-2', 'Nirvana', type), ent('ART-3', 'Katy Perry', type), ent('ART-4', 'Linkin Park', type)]
            : key === 'ART-MET'
            ? [ent('ART-2', 'Nirvana', type), ent('ART-11', 'Slayer', type), ent('ART-9', 'System of a Down', type)]
            : [ent('ART-3', 'Katy Perry', type), ent('ART-12', 'Ariana Grande', type), ent('ART-8', 'Adele', type)];
        const withExplain = explain
          ? list.map((e: any) => ({ ...e, query: { affinity: 0.9, explainability: { 'signal.interests.entities': [{ entity_id: 'ART-MET', score: 0.6 }, { entity_id: 'ART-TS', score: 0.4 }] } } }))
          : list;
        return json({ success: true, results: { entities: withExplain } });
      }
      return json({}, 404);
    }
    if (u.hostname.includes('generativelanguage') || u.hostname.includes('gemini')) {
      if (!gemini) return json({ error: 'no mock' }, 503);
      return json(gemini(JSON.parse(init.body)));
    }
    throw new Error(`unexpected fetch ${url}`);
  }) as typeof fetch;
}

const sample = (): Session =>
  newSession(
    person('a', 'Thabo', [fav('Metallica', 'urn:entity:artist')]),
    person('b', 'Naledi', [fav('Taylor Swift', 'urn:entity:artist')]),
    120,
    ['horror']
  );

beforeEach(() => {
  clearQlooCache();
  AFF = DEFAULT_AFF();
  calls = [];
  gemini = null;
  process.env.QLOO_API_KEY = 'test-key';
  process.env.QLOO_BASE_URL = 'https://hackathon.qloo.test';
  delete process.env.GEMINI_API_KEY;
  process.env.GEMINI_BASE_URL = 'https://generativelanguage.test';
  installFetch();
});

// ---------- validation ----------

test('cleanSession trims text, caps lists and drops bad Qloo ids', () => {
  const s = cleanSession({
    people: [
      { name: '  A very long name that goes on and on  ', favourites: [{ query: 'x', qlooEntityId: 'bad id!' }, { query: 'y' }, { query: 'z' }, { query: 'w' }] },
      { name: 'B\u0000', favourites: [{ query: 'b', type: 'urn:entity:hacker' }], liked: [{ qlooEntityId: 'OK-1', name: 'ok' }, { qlooEntityId: '<script>' }] }
    ],
    minutes: 99999,
    exclusions: ['a', 'b', 'c', 'd', 'e', 'f']
  });
  assert.equal(s.people[0].name.length <= 24, true);
  assert.equal(s.people[0].favourites.length, 3);
  assert.equal(s.people[0].favourites[0].qlooEntityId, undefined);
  assert.equal(s.people[1].name, 'B');
  assert.equal(s.people[1].favourites[0].type, 'urn:entity:artist');
  assert.deepEqual(s.people[1].liked.map((l) => l.qlooEntityId), ['OK-1']);
  assert.equal(s.minutes, 300);
  assert.equal(s.exclusions.length, 5);
});

test('cleanSession refuses a session without two people who each have a favourite', () => {
  assert.throws(() => cleanSession({ people: [{}] }), InputError);
  assert.throws(() => cleanSession({ people: [{ favourites: [{ query: 'a' }] }, { favourites: [] }] }), InputError);
});

test('cleanVerdicts keeps only known verdicts on pick ids', () => {
  assert.deepEqual(cleanVerdicts({ 'pick-ART-1': 'both', 'pick-ART-2': 'maybe', evil: 'a' }), { 'pick-ART-1': 'both' });
  assert.throws(() => cleanVerdicts({ evil: 'a' }), InputError);
});

// ---------- the planner (rules mode) ----------

test('plans only from Qloo results, applies exclusions, confirms tags', async () => {
  const s = await planNight(sample());
  const plan = s.plans[0];
  assert.equal(plan.qlooStatus, 'live');
  assert.equal(plan.planner, 'rules');
  const names = picksOf(plan).map((p) => p.name);
  assert.ok(names.length >= 5, `expected a full plan, got ${names.join(', ')}`);
  assert.ok(!names.includes('The Haunting'), 'horror should be excluded via its Qloo tags');
  // Fairness: Titanic is best for Thabo but worst for Naledi; Slumdog the reverse.
  // Notting Hill is second for both, so on each person's own scale it is the fairest.
  assert.equal(plan.watch?.name, 'Notting Hill');
  // Swaps come from each side alone, chosen by the receiver's fit:
  // from Thabo's side for Naledi: System of a Down (0.65) beats Slayer (0.2).
  assert.equal(plan.swap.forB?.name, 'System of a Down');
  // from Naledi's side for Thabo: Adele (0.7) beats Ariana Grande (0.3).
  assert.equal(plan.swap.forA?.name, 'Adele');
  // Melodic is on both favourites' own tags -> confirmed. Blues is not -> unconfirmed.
  const melodic = plan.commonGround.find((t) => t.name === 'Melodic');
  const blues = plan.commonGround.find((t) => t.name === 'Blues');
  assert.equal(melodic?.confirmed, true);
  assert.equal(blues?.confirmed, false);
  // Every pick is labelled as live Qloo data.
  assert.ok(picksOf(plan).every((p) => p.provenance === 'qloo_live'));
});

test("people's names never reach Qloo", async () => {
  await planNight(sample());
  const qloo = calls.filter((c) => c.url.includes('qloo'));
  assert.ok(qloo.length >= 6);
  for (const c of qloo) assert.ok(!/thabo|naledi/i.test(c.url + (c.body || '')), c.url);
});

test('Mutual Fit Proof: every pick carries both people\'s ranks and the explainability split', async () => {
  const s = await planNight(sample());
  const w = s.plans[0].watch!;
  assert.ok(w.fit?.a && w.fit?.b, 'watch pick has both ranks');
  assert.equal(w.fit!.a!.affinity, 0.85);
  assert.equal(w.fit!.b!.affinity, 0.7);
  assert.equal(w.fit!.a!.rank, 2);
  assert.equal(w.fit!.b!.rank, 2);
  assert.equal(w.fit!.of, 3);
  assert.equal(w.fit!.share?.a, 0.6);
  assert.equal(w.fit!.share?.b, 0.4);
  // The ranks are on the card; the rules note explains them in words without repeating numbers.
  assert.match(w.reason, /both of you|leans away from/);
});

test('fair music: picks favour artists that suit both, not one person\'s favourites', async () => {
  const s = await planNight(sample());
  const listen = s.plans[0].listen.map((p) => p.name);
  // Coldplay (0.6 / 0.9) and Katy Perry (0.5 / 0.95) and Linkin Park (0.9 / 0.45) vs Nirvana (0.95 / 0.4).
  assert.ok(listen.includes('Coldplay'), listen.join(', '));
  assert.equal(listen.length, 3);
});

test('time limit is real: films longer than the time you have are dropped', async () => {
  const s = await planNight(sample());
  const all = picksOf(s.plans[0]).map((p) => p.name);
  assert.ok(!all.includes('A Very Long Epic'));
  assert.ok(s.plans[0].trace.some((t) => /240 min, longer than your 120/.test(t.details)));
});

// ---------- the planner (LLM mode) ----------

test('LLM mode: names stay out of the prompt and invented picks are ignored', async () => {
  process.env.GEMINI_API_KEY = 'test-gemini';
  let prompt = '';
  gemini = (body) => {
    prompt += JSON.stringify(body);
    return {
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        watch_id: 'MOV-5',
        also_ids: ['MOV-INVENTED'],
        listen_ids: ['ART-1'],
        for_a_id: 'ART-8',
        for_b_id: 'ART-9',
        reasons: { 'MOV-5': '{A} and {B} both lean melodic.' },
        why: ['One', 'Two', 'Three'],
        tonight: 'Watch it, {A}.'
      }) }] } }]
    };
  };
  const s = await planNight(sample());
  const plan = s.plans[0];
  assert.equal(plan.planner, 'llm');
  assert.equal(plan.watch?.name, 'Notting Hill');
  assert.equal(plan.watch?.reason, 'Thabo and Naledi both lean melodic.');
  assert.ok(!picksOf(plan).some((p) => p.qlooEntityId === 'MOV-INVENTED'), 'invented id must be dropped');
  assert.ok(plan.alsoWatch.length > 0, 'the empty slot is filled from the fair ranking');
  assert.ok(plan.trace.some((t) => t.action === 'Filled gaps in the plan'));
  assert.ok(plan.trace.every((t) => typeof t.ms === 'number'), 'every step is timed');
  assert.ok(plan.trace.some((t) => t.action === 'Ignored invalid picks'));
  assert.ok(!/thabo|naledi/i.test(prompt), 'names must not be sent to the model');
  assert.equal(plan.tonight, 'Watch it, Thabo.');
});

test('critic: an AI pick that is unfair to one person is replaced, and the trace says why', async () => {
  process.env.GEMINI_API_KEY = 'test-gemini';
  gemini = () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ watch_id: 'MOV-1', listen_ids: ['ART-1'], tonight: '{A} and {B} watch Titanic tonight.' }) }] } }] });
  const s = await planNight(sample());
  assert.equal(s.plans[0].watch?.name, 'Notting Hill');
  // The AI's summary named its own pick, so it must not survive the swap.
  assert.ok(!s.plans[0].tonight.includes('Titanic'));
  assert.ok(s.plans[0].tonight.includes('Notting Hill'));
  assert.ok(s.plans[0].trace.some((t) => t.action === 'Replaced an unfair pick' && /Titanic ranked in the bottom half for Naledi/.test(t.details)));
});

test('LLM failure falls back to rules and says so', async () => {
  process.env.GEMINI_API_KEY = 'test-gemini';
  gemini = null; // every model answers 503
  const s = await planNight(sample());
  assert.equal(s.plans[0].planner, 'rules');
  assert.ok(s.plans[0].notices.some((n) => /busy|failed/i.test(n)));
  assert.ok(s.plans[0].watch);
});

test('Qloo down: nothing is invented, and anything shown is labelled as saved Qloo data', async () => {
  globalThis.fetch = (async () => json({ error: 'down' }, 500)) as typeof fetch;
  const s = await planNight(sample());
  const plan = s.plans[0];
  const picks = picksOf(plan);
  assert.ok(plan.notices.length > 0, 'the plan must say something is wrong');
  // With no saved responses on this machine there are no picks. If an earlier local run saved
  // real Qloo responses (QLOO_CAPTURE), those may be used, but only with the "saved" label.
  assert.ok(picks.every((p) => p.provenance === 'qloo_saved'), 'no pick may claim to be live');
  if (picks.length) assert.equal(plan.qlooStatus, 'saved');
  else assert.notEqual(plan.qlooStatus, 'live');
});

// ---------- learning ----------

test('feedback: both -> both signals, one -> that person, neither -> never again', async () => {
  const first = await planNight(sample());
  const picks = picksOf(first.plans[0]);
  const [p1, p2, p3] = picks;
  const after = applyFeedback(first, { [p1.id]: 'both', [p2.id]: 'a', [p3.id]: 'neither' });
  const [A, B] = after.people;
  assert.ok(A.liked.some((l) => l.qlooEntityId === p1.qlooEntityId));
  assert.ok(B.liked.some((l) => l.qlooEntityId === p1.qlooEntityId));
  assert.ok(A.liked.some((l) => l.qlooEntityId === p2.qlooEntityId));
  assert.ok(!B.liked.some((l) => l.qlooEntityId === p2.qlooEntityId));
  assert.ok(after.rejected.includes(p3.qlooEntityId));
  assert.deepEqual(sharedHitRate(after), { both: 1, tried: 3 });

  const second = await planNight(after);
  const again = picksOf(second.plans[0]).map((p) => p.qlooEntityId);
  assert.ok(!again.includes(p3.qlooEntityId), 'a rejected pick must not come back');
  assert.ok(!again.some((id) => picks.some((p) => p.qlooEntityId === id)), 'nothing from plan 1 repeats');
  assert.equal(second.plans[0].number, 2);
});

test('fill puts names back even when the model forgets the braces', () => {
  const s = sample();
  assert.equal(fill("From B's favourites for A to discover.", s), "From Naledi's favourites for Thabo to discover.");
  assert.equal(fill('A heartwarming film for {A} and {B}.', s), 'A heartwarming film for Thabo and Naledi.');
  assert.equal(fill('A and B both lean melodic.', s), 'Thabo and Naledi both lean melodic.');
  assert.equal(fill('A gripping story.', s), 'A gripping story.');
});

test('trimForClient keeps the session bounded', async () => {
  let s = await planNight(sample());
  for (let i = 0; i < 6; i++) s = { ...s, plans: [s.plans[0], ...s.plans] };
  const t = trimForClient(s);
  assert.ok(t.plans.length <= 4);
  assert.ok(t.plans.slice(1).every((p) => p.trace.length === 0));
});

// ---------- invite links and the blind study ----------

test('invite links round-trip, including non-English names, and reject junk', () => {
  const code = encodeInvite({ v: 1, from: { name: 'Lwazi Ndlovu', favs: [{ query: 'Beyoncé', type: 'urn:entity:artist' }, { query: 'Tsotsi', type: 'urn:entity:movie' }] }, toName: 'Gogo', minutes: 90, avoid: ['horror'] });
  const inv = decodeInvite(`#invite=${code}`);
  assert.ok(inv);
  assert.equal(inv!.from.name, 'Lwazi Ndlovu');
  assert.deepEqual(inv!.from.favs.map((f) => f.query), ['Beyoncé', 'Tsotsi']);
  assert.equal(inv!.from.favs[1].type, 'urn:entity:movie');
  assert.equal(inv!.toName, 'Gogo');
  assert.equal(inv!.minutes, 90);
  assert.equal(decodeInvite('#invite=not-real'), null);
  assert.equal(decodeInvite('#something-else'), null);
});

test('study results encode without names and summarise per method', () => {
  const code = encodeResult({
    v: 1,
    pair: 'abc',
    at: '2026-10-21',
    items: [
      { s: ['qloo'], k: 'watch', a: 'yes', b: 'yes' },
      { s: ['llm'], k: 'watch', a: 'yes', b: 'no' },
      { s: ['qloo', 'llm'], k: 'listen', a: 'maybe', b: 'yes' }
    ]
  });
  const r = decodeResult(code)!;
  assert.equal(r.items.length, 3);
  const s = studySummary([r]);
  assert.equal(s.qloo.items, 2);
  assert.equal(s.qloo.bothYes, 1);
  assert.equal(s.llm.vetoed, 1);
  assert.equal(s.qloo.worstOffScore, (1 + 0.5) / 2);
  assert.equal(decodeResult('garbage'), null);
});

// ---------- South African picks ----------

test('South African lane: SA artists ranked fairly for both; no venue lookups', async () => {
  const s = await planNight(sample());
  const plan = s.plans[0];
  assert.ok(plan.local.length >= 2, 'has South African picks');
  assert.ok(plan.local.every((p) => p.kind === 'local' && p.local === true));
  // Nasty C (0.7/0.6) and Master KG (0.65/0.62) suit both; Tyla (0.4/0.9) is one-sided, so it ranks last.
  assert.equal(plan.local[plan.local.length - 1].name, 'Tyla');
  // Venues were cut: our place tests showed location, not taste, decides them.
  assert.equal(lastPlaceQuery, '');
  assert.ok(!calls.some((c) => c.url.includes('urn%3Aentity%3Aplace') || c.url.includes('urn:entity:place')));
});

test('South African lane can be switched off', async () => {
  const sess = sample();
  sess.includeLocal = false;
  const s = await planNight(sess);
  assert.equal(s.plans[0].local.length, 0);
  assert.ok(!calls.some((c) => c.url.includes('south_africa')));
});

test('"top half for both" is judged on ranks, so #4 of 5 never counts as suiting both', () => {
  const f = (ra: number, rb: number, of: number) => ({ of, a: { affinity: 0.5, rank: ra, norm: 0 }, b: { affinity: 0.5, rank: rb, norm: 0 } });
  assert.equal(topHalfForBoth(f(4, 2, 5)), false);
  assert.equal(topHalfForBoth(f(3, 2, 5)), true);
  assert.equal(topHalfForBoth(f(2, 2, 3)), true);
  assert.equal(topHalfForBoth(undefined), false);
});

test('a music-only favourite still gets a film rank, scored from its Qloo tags, and the trace says so', async () => {
  NO_SCORE.add('ART-MET|urn:entity:movie');
  AFF['urn:tag:genre:energetic,urn:tag:genre:melodic,urn:tag:genre:rock'] = { 'MOV-1': 0.6, 'MOV-3': 0.9, 'MOV-5': 0.7 };
  try {
    const s = await planNight(sample());
    const w = s.plans[0].watch!;
    assert.ok(w.fit?.a, 'Thabo has a rank for the film');
    assert.equal(w.fit?.a?.via, 'tags');
    assert.equal(w.fit?.b?.via, undefined);
    assert.ok(s.plans[0].trace.some((t) => t.action === 'Scored across domains'));
    assert.ok(calls.some((c) => c.url.includes('signal.interests.tags=')));
  } finally {
    NO_SCORE.clear();
  }
});

test('an exact name beats a longer one that contains it ("Tyla" is not "Tyla Yaweh")', async () => {
  const { bestMatch } = await import('../lib/cg/match');
  assert.equal(bestMatch([{ name: 'Tyla Yaweh' }, { name: 'Tyla' }], 'tyla')?.name, 'Tyla');
  assert.equal(bestMatch([{ name: 'The Weeknd' }], 'weeknd')?.name, 'The Weeknd');
  assert.equal(bestMatch([{ name: 'Adele' }], 'Drake'), undefined);
});
