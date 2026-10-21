import { NextRequest, NextResponse } from 'next/server';
import { qlooRelated, qlooScore } from '../../../../lib/qloo-client';
import { cleanId, cleanText, InputError } from '../../../../lib/cg/validate';
import { guarded, readJson } from '../../../../lib/server/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/** Kinds of date spot, mapped to Qloo place tags (each checked on the hackathon API, Oct 2026). */
const KINDS: Record<string, string> = {
  food: 'urn:tag:category:place:restaurant',
  coffee: 'urn:tag:category:place:cafe',
  drinks: 'urn:tag:category:place:bar',
  outdoors: 'urn:tag:category:place:park',
  music: 'urn:tag:category:place:live_music_venue'
};
const RADIUS_M = 30_000;

const ids = (v: unknown) => Array.from(new Set((Array.isArray(v) ? v : []).map(cleanId).filter(Boolean) as string[])).slice(0, 6);

/**
 * Date spots within 30 km of an address or area. Qloo finds places for both tastes together, then
 * each place is scored for each person on their own, so a spot can be shown as good for both.
 */
export async function POST(request: NextRequest) {
  return guarded(
    request,
    'spots',
    async () => {
      const body = (await readJson(request, 6_000)) as any;
      const a = ids(body?.a);
      const b = ids(body?.b);
      const where = cleanText(body?.where, 100);
      const kind = typeof body?.kind === 'string' && KINDS[body.kind] ? body.kind : 'food';
      if (!a.length || !b.length) throw new InputError('Make a plan first, so we know both your tastes.');
      if (where.length < 3) throw new InputError('Type your area or address.');
      const joint = Array.from(new Set([...a, ...b]));
      const found = await qlooRelated(joint.join(','), 'urn:entity:place', { take: 8, tags: KINDS[kind], locationQuery: where, radiusMeters: RADIUS_M });
      if (found.source === 'unavailable') return NextResponse.json({ error: 'Qloo didn’t answer just now. Try again in a moment.' }, { status: 503 });
      const list = found.data.filter((e) => e.place?.address || e.name);
      const placeIds = list.map((e) => e.id);
      const [sa, sb] = placeIds.length
        ? await Promise.all([qlooScore(a, 'urn:entity:place', placeIds), qlooScore(b, 'urn:entity:place', placeIds)])
        : [{ data: {} as Record<string, number> }, { data: {} as Record<string, number> }];
      const rankOf = (scores: Record<string, number>) => {
        const order = placeIds.filter((id) => typeof scores[id] === 'number').sort((x, y) => scores[y] - scores[x]);
        return (id: string) => (order.includes(id) ? order.indexOf(id) + 1 : undefined);
      };
      const ra = rankOf(sa.data);
      const rb = rankOf(sb.data);
      const spots = list.map((e) => ({
        id: e.id,
        name: e.name,
        address: e.place?.address,
        website: e.place?.website && /^https?:\/\//.test(e.place.website) ? e.place.website : undefined,
        image: e.image,
        lat: e.place?.lat,
        lng: e.place?.lng,
        tags: (e.tags || []).slice(0, 3),
        rankA: ra(e.id),
        rankB: rb(e.id),
        of: placeIds.length
      }));
      return NextResponse.json({ spots, where, kind, radiusKm: RADIUS_M / 1000, source: found.source });
    },
    { bucket: 'spots', max: 40 }
  );
}
