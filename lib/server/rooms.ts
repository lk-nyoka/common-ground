/**
 * Live rooms: two people swipe on tonight's picks on their own phones, matches appear for both
 * the moment they agree, and a watch party keeps a shared countdown, timer and reactions.
 *
 * Storage: in the server's memory only (no database, by design for the free tier). Rooms expire
 * after 24 hours and are lost if the server restarts. Each room holds the two first names and the
 * list of picks; nothing is sent to Qloo or the AI from here.
 */
import { randomBytes } from 'crypto';

export type Who = 'a' | 'b';
export type Swipe = 'yes' | 'no';

export interface RoomItem {
  id: string; // Qloo entity id
  name: string;
  type: string;
  image?: string;
  year?: number;
  spotifyId?: string;
  netflixId?: string;
  rankA?: number;
  rankB?: number;
  of?: number;
  local?: boolean;
}

export interface Party {
  itemId: string;
  state: 'countdown' | 'playing' | 'paused' | 'ended';
  startAt: number; // server time when playback starts (after the countdown)
  elapsedMs: number; // played before the current segment
  by: Who; // who did the last thing
}

export interface Room {
  id: string;
  createdAt: number;
  names: [string, string];
  items: RoomItem[];
  swipes: Record<Who, Record<string, Swipe>>;
  matches: string[];
  party?: Party;
  reactions: { who: Who; emoji: string; at: number }[];
  seen: Partial<Record<Who, number>>;
  version: number;
}

export type RoomAction =
  | { type: 'swipe'; who: Who; itemId: string; value: Swipe }
  | { type: 'party_start'; who: Who; itemId: string }
  | { type: 'party_pause'; who: Who }
  | { type: 'party_resume'; who: Who }
  | { type: 'party_end'; who: Who }
  | { type: 'react'; who: Who; emoji: string }
  | { type: 'hello'; who: Who };

export const EMOJI = ['😂', '😍', '😱', '👏', '🔥', '😭'];
export const COUNTDOWN_MS = 5000;
const TTL_MS = 24 * 60 * 60 * 1000;
const MAX_ROOMS = 500;

export class RoomError extends Error {}

/** Pure: apply one action to a room. Returns a new room (or throws RoomError). */
export function applyAction(room: Room, action: RoomAction, now: number): Room {
  const r: Room = JSON.parse(JSON.stringify(room));
  r.seen[action.who] = now;
  switch (action.type) {
    case 'hello':
      return r;
    case 'swipe': {
      if (!r.items.some((i) => i.id === action.itemId)) throw new RoomError('That pick isn’t in this room.');
      r.swipes[action.who][action.itemId] = action.value;
      const both = r.swipes.a[action.itemId] === 'yes' && r.swipes.b[action.itemId] === 'yes';
      if (both && !r.matches.includes(action.itemId)) r.matches.push(action.itemId);
      if (!both) r.matches = r.matches.filter((m) => m !== action.itemId);
      break;
    }
    case 'party_start': {
      if (!r.items.some((i) => i.id === action.itemId)) throw new RoomError('That pick isn’t in this room.');
      r.party = { itemId: action.itemId, state: 'countdown', startAt: now + COUNTDOWN_MS, elapsedMs: 0, by: action.who };
      break;
    }
    case 'party_pause': {
      const p = r.party;
      if (!p || (p.state !== 'playing' && p.state !== 'countdown')) throw new RoomError('Nothing is playing.');
      // If paused during the countdown, nothing has played yet.
      p.elapsedMs += Math.max(0, now - p.startAt);
      p.state = 'paused';
      p.by = action.who;
      break;
    }
    case 'party_resume': {
      const p = r.party;
      if (!p || p.state !== 'paused') throw new RoomError('Nothing is paused.');
      p.state = 'countdown';
      p.startAt = now + 3000;
      p.by = action.who;
      break;
    }
    case 'party_end': {
      if (r.party) {
        r.party.state = 'ended';
        r.party.by = action.who;
      }
      break;
    }
    case 'react': {
      if (!EMOJI.includes(action.emoji)) throw new RoomError('That reaction isn’t available.');
      r.reactions = [...r.reactions, { who: action.who, emoji: action.emoji, at: now }].slice(-40);
      break;
    }
  }
  r.version++;
  return r;
}

/** Where playback is right now, on the server's clock. The countdown becomes "playing" by itself. */
export function partyClock(p: Party, now: number): { state: Party['state']; elapsedMs: number; countdownMs: number } {
  if (p.state === 'countdown') {
    if (now >= p.startAt) return { state: 'playing', elapsedMs: p.elapsedMs + (now - p.startAt), countdownMs: 0 };
    return { state: 'countdown', elapsedMs: p.elapsedMs, countdownMs: p.startAt - now };
  }
  if (p.state === 'playing') return { state: 'playing', elapsedMs: p.elapsedMs + (now - p.startAt), countdownMs: 0 };
  return { state: p.state, elapsedMs: p.elapsedMs, countdownMs: 0 };
}

// ---------- the in-memory store ----------

const rooms = new Map<string, Room>();
const listeners = new Map<string, Set<(room: Room) => void>>();

function sweep(now: number) {
  rooms.forEach((r, id) => {
    if (now - r.createdAt > TTL_MS) {
      rooms.delete(id);
      listeners.delete(id);
    }
  });
  if (rooms.size >= MAX_ROOMS) {
    const oldest = Array.from(rooms.values()).sort((x, y) => x.createdAt - y.createdAt)[0];
    if (oldest) rooms.delete(oldest.id);
  }
}

export function createRoom(names: [string, string], items: RoomItem[], now = Date.now()): Room {
  sweep(now);
  const id = randomBytes(9).toString('base64url');
  const room: Room = { id, createdAt: now, names, items, swipes: { a: {}, b: {} }, matches: [], reactions: [], seen: {}, version: 1 };
  rooms.set(id, room);
  return room;
}

export function getRoom(id: string): Room | undefined {
  const r = rooms.get(id);
  if (r && Date.now() - r.createdAt > TTL_MS) {
    rooms.delete(id);
    return undefined;
  }
  return r;
}

export function act(id: string, action: RoomAction): Room {
  const room = getRoom(id);
  if (!room) throw new RoomError('This room has expired. Start a new one from your plan.');
  const next = applyAction(room, action, Date.now());
  rooms.set(id, next);
  listeners.get(id)?.forEach((fn) => {
    try {
      fn(next);
    } catch {
      /* a closed connection */
    }
  });
  return next;
}

export function subscribe(id: string, fn: (room: Room) => void): () => void {
  const set = listeners.get(id) || new Set();
  set.add(fn);
  listeners.set(id, set);
  return () => {
    set.delete(fn);
    if (!set.size) listeners.delete(id);
  };
}

/** For tests. */
export function resetRooms() {
  rooms.clear();
  listeners.clear();
}
