import type { Pick, Plan } from './types';
import { picksOf } from './learn';

/** The swipe deck for a live room: tonight's picks, best evidence first, at most 16. */
export function roomItemsFrom(plan: Plan) {
  const seen = new Set<string>();
  const out: ReturnType<typeof toItem>[] = [];
  for (const p of picksOf(plan)) {
    if (seen.has(p.qlooEntityId)) continue;
    seen.add(p.qlooEntityId);
    out.push(toItem(p));
    if (out.length >= 16) break;
  }
  return out;
}

function toItem(p: Pick) {
  return {
    id: p.qlooEntityId,
    name: p.name,
    type: p.type,
    image: p.image,
    year: p.year,
    spotifyId: p.external?.spotifyId,
    netflixId: p.external?.netflixId,
    rankA: p.fit?.a?.rank,
    rankB: p.fit?.b?.rank,
    of: p.fit?.of,
    local: p.local === true
  };
}
