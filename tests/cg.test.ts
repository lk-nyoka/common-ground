/**
 * Common Ground tests. Qloo and Gemini are mocked, so these run offline and never use real keys.
 * Run with: npm test
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { cleanSession, cleanVerdicts, InputError, trimForClient } from '../lib/cg/validate';
import { applyFeedback, picksOf, sharedHitRate } from '../lib/cg/learn';
import { planNight } from '../lib/cg/agent';
import { clearQlooCache } from '../lib/qloo-client';
import { fav, newSession, person } from '../lib/cg/samples';
import type { Session } from '../lib/cg/types';

// ---------- a fake Qloo + Gemini ----------

const ent = (id: string, name: string, type: string, tags: string[] = [], extra: Record<string, unknown> = {}) => ({
  entity_id: id,
  name,
  type: 'urn:entity',
  subtype: type,
  types: [type],
  tags: tags.map((t) => ({ name: t })),
  properties: { image: { url: `https://img.example/${id}.jpg` }, ...extra }
});

const SEARCH: Record<string, any> = {
  metallica: ent('ART-MET', 'Metallica', 'urn:entity:artist', ['Energetic', 'Melodic', 'Rock']),
  'taylor swift': ent('ART-TS', 'Taylor Swift', 'urn:entity:artist', ['Melodic', 'Love', 'Pop'])
};

let calls: { url: string; body?: string }[] = [];
let gemini: ((body: any) => any) | null = null;

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
      if (u.pathname === '/v2/insights') {
        const type = u.searchParams.get('filter.type') || '';
        const signal = u.searchParams.get('signal.interests.entities') || '';
        const key = signal.includes(',') ? 'both' : signal;
        const list =
          type.includes('movie')
            ? [ent('MOV-1', 'Titanic', type, ['Drama'], { release_year: 1997 }), ent('MOV-2', 'The Haunting', type, ['Horror']), ent('MOV-3', 'Slumdog Millionaire', type, ['Drama'], { release_year: 2008 })]
            : type.includes('tv')
            ? [ent('TV-1', 'The Red Road', type, ['Drama'])]
            : key === 'both'
            ? [ent('ART-1', 'Coldplay', type), ent('ART-2', 'Nirvana', type), ent('ART-3', 'Katy Perry', type), ent('ART-4', 'Linkin Park', type)]
            : key === 'ART-MET'
            ? [ent('ART-2', 'Nirvana', type), ent('ART-9', 'System of a Down', type)]
            : [ent('ART-3', 'Katy Perry', type), ent('ART-8', 'Adele', type)];
        return json({ success: true, results: { entities: list } });
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
  assert.equal(plan.watch?.name, 'Titanic');
  // Swaps come from each side alone, not from the joint list.
  assert.equal(plan.swap.forB?.name, 'System of a Down');
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

test('balanced music: joint artists that also appear on each side come first', async () => {
  const s = await planNight(sample());
  const listen = s.plans[0].listen.map((p) => p.name);
  // Nirvana is on Thabo's side, Katy Perry on Naledi's: both should be in the three.
  assert.ok(listen.includes('Nirvana') && listen.includes('Katy Perry'), listen.join(', '));
});

// ---------- the planner (LLM mode) ----------

test('LLM mode: names stay out of the prompt and invented picks are ignored', async () => {
  process.env.GEMINI_API_KEY = 'test-gemini';
  let prompt = '';
  gemini = (body) => {
    prompt += JSON.stringify(body);
    return {
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        watch_id: 'MOV-3',
        also_ids: ['MOV-INVENTED'],
        listen_ids: ['ART-1'],
        for_a_id: 'ART-8',
        for_b_id: 'ART-9',
        reasons: { 'MOV-3': '{A} and {B} both lean melodic.' },
        why: ['One', 'Two', 'Three'],
        tonight: 'Watch it, {A}.'
      }) }] } }]
    };
  };
  const s = await planNight(sample());
  const plan = s.plans[0];
  assert.equal(plan.planner, 'llm');
  assert.equal(plan.watch?.name, 'Slumdog Millionaire');
  assert.equal(plan.watch?.reason, 'Thabo and Naledi both lean melodic.');
  assert.equal(plan.alsoWatch.length, 0, 'invented id must be dropped');
  assert.ok(plan.trace.some((t) => t.action === 'Ignored invalid picks'));
  assert.ok(!/thabo|naledi/i.test(prompt), 'names must not be sent to the model');
  assert.equal(plan.tonight, 'Watch it, Thabo.');
});

test('LLM failure falls back to rules and says so', async () => {
  process.env.GEMINI_API_KEY = 'test-gemini';
  gemini = null; // every model answers 503
  const s = await planNight(sample());
  assert.equal(s.plans[0].planner, 'rules');
  assert.ok(s.plans[0].notices.some((n) => /busy|failed/i.test(n)));
  assert.ok(s.plans[0].watch);
});

test('Qloo down: no plan is invented', async () => {
  globalThis.fetch = (async () => json({ error: 'down' }, 500)) as typeof fetch;
  const s = await planNight(sample());
  assert.equal(picksOf(s.plans[0]).length, 0);
  assert.ok(s.plans[0].notices.length > 0);
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

test('trimForClient keeps the session bounded', async () => {
  let s = await planNight(sample());
  for (let i = 0; i < 6; i++) s = { ...s, plans: [s.plans[0], ...s.plans] };
  const t = trimForClient(s);
  assert.ok(t.plans.length <= 4);
  assert.ok(t.plans.slice(1).every((p) => p.trace.length === 0));
});
