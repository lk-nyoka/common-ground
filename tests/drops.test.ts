/** Taste drops: the on-device model, its explanations, and the push schedule. Offline. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FEATURES, featuresOf, learnedSummary, loadModel, newModel, predict, rankDrops, update, type DropCandidate } from '../lib/cg/drops-model';
import { decodeProfile, encodeProfile } from '../lib/cg/drops-profile';
import { nextLocalHour } from '../lib/server/push';

const cand = (id: string, o: Partial<DropCandidate> = {}): DropCandidate => ({ id, name: id, type: 'urn:entity:artist', tags: [], affinity: 0.5, popularity: 0.5, local: false, ...o });

// A repeatable random source.
const seeded = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

test('before any reactions, Qloo affinity leads the ranking', () => {
  const m = newModel();
  const r = rankDrops(m, [cand('low', { affinity: 0.1 }), cand('high', { affinity: 0.95 }), cand('mid', { affinity: 0.5 })], seeded(7));
  assert.equal([...r].sort((x, y) => y.p - x.p)[0].candidate.id, 'high');
  assert.ok(r[0].reasons.some((s) => s.startsWith('Qloo rates it')));
});

test('it learns a preference for South African picks from reactions', () => {
  let m = newModel();
  const sa = cand('sa', { local: true, affinity: 0.6 });
  const other = cand('x', { affinity: 0.6 });
  for (let i = 0; i < 6; i++) {
    m = update(m, featuresOf(sa, m, 0.5), 1, { id: `sa${i}`, name: 'sa', tags: ['Amapiano'] });
    m = update(m, featuresOf(other, m, 0.5), 0, { id: `x${i}`, name: 'x', tags: ['Rock'] });
  }
  assert.ok(m.mean[FEATURES.indexOf('local')] > 0.5, 'the South African weight rose');
  assert.ok(predict(m, featuresOf(sa, m, 0.5)) > predict(m, featuresOf(other, m, 0.5)) + 0.2);
  assert.ok(learnedSummary(m).some((s) => s.includes('South African')));
  assert.equal(m.likedTags.amapiano, 6);
  // Uncertainty shrinks where it has seen evidence.
  assert.ok(m.precision[FEATURES.indexOf('local')] > 1);
});

test('drops already shown are not repeated, and Thompson sampling sometimes explores', () => {
  let m = newModel();
  m = update(m, featuresOf(cand('a'), m, 1), 1, { id: 'a', name: 'a', tags: [] });
  const pool = Array.from({ length: 10 }, (_, i) => cand(`c${i}`, { affinity: 0.5 + i * 0.01, local: i % 2 === 0, popularity: i / 10 }));
  assert.ok(!rankDrops(m, [...pool, cand('a')]).some((d) => d.candidate.id === 'a'));
  let explored = 0;
  const rand = seeded(42);
  for (let i = 0; i < 200; i++) if (rankDrops(m, pool, rand)[0].exploring) explored++;
  assert.ok(explored > 0 && explored < 200, `explored ${explored} of 200`);
});

test('a broken stored model is replaced with a fresh one', () => {
  assert.deepEqual(loadModel({ version: 1, mean: [1], precision: [1] }).mean, newModel().mean);
  assert.deepEqual(loadModel(null).mean, newModel().mean);
  const good = update(newModel(), featuresOf(cand('a'), newModel(), 1), 1, { id: 'a', name: 'a', tags: [] });
  assert.deepEqual(loadModel(JSON.parse(JSON.stringify(good))).mean, good.mean);
});

test('drops links carry only ids, names and the local flag, and reject junk', () => {
  const p = { name: 'Naledi', signals: [{ id: 'ABC-123', name: 'Tyla' }], local: true };
  assert.deepEqual(decodeProfile(encodeProfile(p)), p);
  assert.equal(decodeProfile('not-base64!!'), null);
});

test('the daily drop is scheduled for the next local hour', () => {
  // 2026-10-21 10:00 UTC is 12:00 in Johannesburg (UTC+2).
  const now = Date.UTC(2026, 9, 21, 10, 0, 0);
  assert.equal(nextLocalHour(now, 19, 120), Date.UTC(2026, 9, 21, 17, 0, 0));
  // Already past 09:00 local, so tomorrow.
  assert.equal(nextLocalHour(now, 9, 120), Date.UTC(2026, 9, 22, 7, 0, 0));
});
