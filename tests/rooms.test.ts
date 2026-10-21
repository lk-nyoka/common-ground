/** Live rooms: matching, the shared watch-party clock, and the store. Offline. */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { act, applyAction, COUNTDOWN_MS, createRoom, getRoom, partyClock, resetRooms, RoomError, subscribe, type Room } from '../lib/server/rooms';
import { publicRoom } from '../lib/server/room-view';

const items = [
  { id: 'M1', name: 'Film one', type: 'urn:entity:movie' },
  { id: 'M2', name: 'Film two', type: 'urn:entity:movie' },
  { id: 'A1', name: 'Artist', type: 'urn:entity:artist', spotifyId: 'abc' }
];
beforeEach(() => resetRooms());

test('a match appears only when both say yes, and goes if one changes their mind', () => {
  let r: Room = createRoom(['Thabo', 'Naledi'], items, 0);
  r = applyAction(r, { type: 'swipe', who: 'a', itemId: 'M1', value: 'yes' }, 1);
  assert.deepEqual(r.matches, []);
  r = applyAction(r, { type: 'swipe', who: 'b', itemId: 'M2', value: 'yes' }, 2);
  assert.deepEqual(r.matches, []);
  r = applyAction(r, { type: 'swipe', who: 'b', itemId: 'M1', value: 'yes' }, 3);
  assert.deepEqual(r.matches, ['M1']);
  r = applyAction(r, { type: 'swipe', who: 'a', itemId: 'M1', value: 'no' }, 4);
  assert.deepEqual(r.matches, []);
});

test('swipes on picks outside the room are refused', () => {
  const r = createRoom(['A', 'B'], items, 0);
  assert.throws(() => applyAction(r, { type: 'swipe', who: 'a', itemId: 'NOPE', value: 'yes' }, 1), RoomError);
  assert.throws(() => applyAction(r, { type: 'react', who: 'a', emoji: '💩' }, 1), RoomError);
});

test('the party clock counts down, plays, pauses and resumes on the server clock', () => {
  let r = createRoom(['A', 'B'], items, 0);
  r = applyAction(r, { type: 'party_start', who: 'a', itemId: 'M1' }, 1000);
  assert.equal(partyClock(r.party!, 2000).state, 'countdown');
  assert.equal(partyClock(r.party!, 2000).countdownMs, COUNTDOWN_MS - 1000);
  const start = 1000 + COUNTDOWN_MS;
  assert.deepEqual(partyClock(r.party!, start + 60_000), { state: 'playing', elapsedMs: 60_000, countdownMs: 0 });
  r = applyAction(r, { type: 'party_pause', who: 'b' }, start + 60_000);
  assert.equal(partyClock(r.party!, start + 999_999).elapsedMs, 60_000);
  assert.equal(r.party!.by, 'b');
  r = applyAction(r, { type: 'party_resume', who: 'a' }, start + 100_000);
  // Resume counts in for 3 seconds, then carries on from where it paused.
  assert.equal(partyClock(r.party!, start + 101_000).state, 'countdown');
  assert.equal(partyClock(r.party!, start + 113_000).elapsedMs, 70_000);
});

test('pausing during the countdown keeps the time at zero', () => {
  let r = createRoom(['A', 'B'], items, 0);
  r = applyAction(r, { type: 'party_start', who: 'a', itemId: 'A1' }, 0);
  r = applyAction(r, { type: 'party_pause', who: 'a' }, 2000);
  assert.equal(r.party!.elapsedMs, 0);
});

test('the store tells listeners about changes and exposes presence and the server clock', () => {
  const r = createRoom(['A', 'B'], items);
  const seen: number[] = [];
  const off = subscribe(r.id, (room) => seen.push(room.version));
  act(r.id, { type: 'swipe', who: 'a', itemId: 'M1', value: 'yes' });
  act(r.id, { type: 'hello', who: 'b' });
  off();
  act(r.id, { type: 'swipe', who: 'b', itemId: 'M1', value: 'yes' });
  assert.equal(seen.length, 2);
  const view = publicRoom(getRoom(r.id)!);
  assert.equal(view.online.b, true);
  assert.deepEqual(view.matches, ['M1']);
  assert.equal(typeof view.serverNow, 'number');
  assert.throws(() => act('missing-room', { type: 'hello', who: 'a' }), /expired/);
});

// ---------- tester feedback ----------
import { cleanFeedback, discordText, feedbackSummary, resetFeedback, saveFeedback } from '../lib/server/feedback';

test('feedback keeps only known answers and never more than a short note', async () => {
  resetFeedback();
  assert.equal(cleanFeedback({}), null);
  const f = cleanFeedback({ ease: 4, fit: 'both', liked: ['mzansi', 'hack', 'mzansi'], again: 'maybe', comment: 'x'.repeat(900), context: { planNumber: 2, sample: true, page: 'plan', evil: 1 } })!;
  assert.equal(f.ease, 4);
  assert.deepEqual(f.liked, ['mzansi']);
  assert.equal(f.comment!.length, 600);
  assert.equal((f.context as any).evil, undefined);
  assert.equal(cleanFeedback({ ease: 9, fit: 'lots' }), null);
  delete process.env.FEEDBACK_WEBHOOK_URL;
  await saveFeedback(f);
  const s = feedbackSummary();
  assert.equal(s.responses, 1);
  assert.equal(s.meanEase, 4);
  assert.equal(s.picks.both, 1);
  assert.match(discordText(f), /★★★★☆/);
});
