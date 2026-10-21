/**
 * Pair spaces: what joins the two phones after an invite. When the invited person makes the plan,
 * it appears on the inviter's phone too, and the two can chat beside it.
 *
 * Storage: the server's memory only (no database, by design for the free tier). A space lasts 48
 * hours and is lost if the server restarts; both phones keep their own copy of the plan anyway.
 * Anyone with the link can read the space, so the link should only go to the other person.
 */
import { randomBytes } from 'crypto';
import type { Session } from '../cg/types';

export type Who = 'a' | 'b';

export interface Message {
  id: string;
  who: Who;
  text: string;
  at: number;
}

export interface Pair {
  id: string;
  createdAt: number;
  names: [string, string];
  session?: Session;
  sessionVersion: number; // goes up each time a phone shares a newer plan
  sessionBy?: Who;
  stage: 'waiting' | 'joined' | 'planning' | 'ready';
  messages: Message[];
  seen: Partial<Record<Who, number>>;
  version: number;
}

export class PairError extends Error {}

const TTL_MS = 48 * 60 * 60 * 1000;
const MAX_PAIRS = 1000;
const MAX_MESSAGES = 200;
export const MAX_MESSAGE = 500;
const pairs = new Map<string, Pair>();
const listeners = new Map<string, Set<(p: Pair) => void>>();

export const PAIR_ID = /^[A-Za-z0-9_-]{10,20}$/;

function sweep(now: number) {
  pairs.forEach((p, id) => {
    if (now - p.createdAt > TTL_MS) {
      pairs.delete(id);
      listeners.delete(id);
    }
  });
  while (pairs.size >= MAX_PAIRS) {
    const oldest = Array.from(pairs.values()).sort((x, y) => x.createdAt - y.createdAt)[0];
    if (!oldest) break;
    pairs.delete(oldest.id);
  }
}

export function createPair(names: [string, string], now = Date.now()): Pair {
  sweep(now);
  const id = randomBytes(9).toString('base64url');
  const pair: Pair = { id, createdAt: now, names, sessionVersion: 0, stage: 'waiting', messages: [], seen: { a: now }, version: 1 };
  pairs.set(id, pair);
  return pair;
}

export function getPair(id: string): Pair | undefined {
  const p = pairs.get(id);
  if (p && Date.now() - p.createdAt > TTL_MS) {
    pairs.delete(id);
    return undefined;
  }
  return p;
}

export type PairAction =
  | { type: 'hello'; who: Who; name?: string }
  | { type: 'planning'; who: Who }
  | { type: 'session'; who: Who; session: Session }
  | { type: 'message'; who: Who; text: string };

/** Pure: apply one action. Messages are trimmed and capped; a shared plan replaces the last one. */
export function applyPair(pair: Pair, action: PairAction, now: number): Pair {
  const p: Pair = { ...pair, seen: { ...pair.seen, [action.who]: now }, messages: pair.messages };
  switch (action.type) {
    case 'hello':
      if (action.who === 'b' && p.stage === 'waiting') p.stage = 'joined';
      if (action.name) {
        const names: [string, string] = [...p.names];
        names[action.who === 'a' ? 0 : 1] = action.name;
        p.names = names;
      }
      break;
    case 'planning':
      if (p.stage !== 'ready') p.stage = 'planning';
      break;
    case 'session':
      p.session = action.session;
      p.sessionVersion = pair.sessionVersion + 1;
      p.sessionBy = action.who;
      p.stage = 'ready';
      p.names = [action.session.people[0].name, action.session.people[1].name];
      break;
    case 'message': {
      const text = action.text.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').trim().slice(0, MAX_MESSAGE);
      if (!text) throw new PairError('Type a message first.');
      const last = pair.messages.filter((m) => m.who === action.who).slice(-1)[0];
      if (last && now - last.at < 400) throw new PairError('Slow down a little.');
      p.messages = [...pair.messages, { id: randomBytes(6).toString('base64url'), who: action.who, text, at: now }].slice(-MAX_MESSAGES);
      break;
    }
  }
  // Presence pings don't need to wake the other phone unless something visible changed.
  p.version = pair.version + 1;
  return p;
}

export function actOnPair(id: string, action: PairAction): Pair {
  const pair = getPair(id);
  if (!pair) throw new PairError('This link has expired. Make a new plan to start again.');
  const next = applyPair(pair, action, Date.now());
  pairs.set(id, next);
  listeners.get(id)?.forEach((fn) => {
    try {
      fn(next);
    } catch {
      /* closed connection */
    }
  });
  return next;
}

export function subscribePair(id: string, fn: (p: Pair) => void): () => void {
  const set = listeners.get(id) || new Set();
  set.add(fn);
  listeners.set(id, set);
  return () => {
    set.delete(fn);
    if (!set.size) listeners.delete(id);
  };
}

/** What the phones get on every change: small, without the plan itself (fetched when it changes). */
export function pairView(p: Pair, now = Date.now()) {
  return {
    id: p.id,
    names: p.names,
    stage: p.stage,
    sessionVersion: p.sessionVersion,
    sessionBy: p.sessionBy,
    messages: p.messages.slice(-80),
    online: { a: !!p.seen.a && now - p.seen.a < 45_000, b: !!p.seen.b && now - p.seen.b < 45_000 },
    version: p.version,
    serverNow: now
  };
}
export type PairView = ReturnType<typeof pairView>;

export function resetPairs() {
  pairs.clear();
  listeners.clear();
}
