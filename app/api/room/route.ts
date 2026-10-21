import { NextRequest, NextResponse } from 'next/server';
import { createRoom, type RoomItem } from '../../../lib/server/rooms';
import { cleanId, cleanText, InputError } from '../../../lib/cg/validate';
import { guarded, readJson } from '../../../lib/server/http';

export const dynamic = 'force-dynamic';

const MAX_ITEMS = 16;
const httpsUrl = (u: unknown) => (typeof u === 'string' && /^https:\/\/images\.qloo\.com\//.test(u) ? u.slice(0, 500) : undefined);
const num = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max ? Math.round(v) : undefined);
const extId = (v: unknown) => (typeof v === 'string' && /^[A-Za-z0-9]{1,40}$/.test(v) ? v : undefined);

function cleanItem(v: unknown): RoomItem | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const id = cleanId(o.id);
  const name = cleanText(o.name, 120);
  const type = typeof o.type === 'string' && /^urn:entity:(movie|tv_show|artist)$/.test(o.type) ? o.type : null;
  if (!id || !name || !type) return null;
  return {
    id,
    name,
    type,
    image: httpsUrl(o.image),
    year: num(o.year, 3000),
    spotifyId: extId(o.spotifyId),
    netflixId: extId(o.netflixId),
    rankA: num(o.rankA, 1000),
    rankB: num(o.rankB, 1000),
    of: num(o.of, 1000),
    local: o.local === true
  };
}

/** Start a live room from tonight's picks. Returns the room id; the partner joins with ?p=b. */
export async function POST(request: NextRequest) {
  return guarded(
    request,
    'room_create',
    async () => {
      const body = (await readJson(request, 60_000)) as { names?: unknown; items?: unknown };
      const names = Array.isArray(body?.names) ? body.names : [];
      const a = cleanText(names[0], 24) || 'You';
      const b = cleanText(names[1], 24) || 'Them';
      const seen = new Set<string>();
      const items = (Array.isArray(body?.items) ? body.items : [])
        .map(cleanItem)
        .filter((i): i is RoomItem => !!i && !seen.has(i.id) && !!seen.add(i.id))
        .slice(0, MAX_ITEMS);
      if (items.length < 2) throw new InputError('A room needs at least two picks. Make a plan first.');
      const room = createRoom([a, b], items);
      return NextResponse.json({ id: room.id });
    },
    { bucket: 'room', max: 30 }
  );
}
