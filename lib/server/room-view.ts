import { partyClock, type Room } from './rooms';

/** What both phones see. Includes the server clock so each phone can line its countdown up. */
export function publicRoom(room: Room, now = Date.now()) {
  return {
    id: room.id,
    names: room.names,
    items: room.items,
    swipes: room.swipes,
    matches: room.matches,
    party: room.party ? { ...room.party, clock: partyClock(room.party, now) } : undefined,
    reactions: room.reactions.slice(-12),
    online: {
      a: !!room.seen.a && now - room.seen.a < 45_000,
      b: !!room.seen.b && now - room.seen.b < 45_000
    },
    version: room.version,
    serverNow: now
  };
}

export type PublicRoom = ReturnType<typeof publicRoom>;
