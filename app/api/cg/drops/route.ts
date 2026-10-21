import { NextRequest, NextResponse } from 'next/server';
import { qlooRelated } from '../../../../lib/qloo-client';
import { cleanId, InputError } from '../../../../lib/cg/validate';
import { guarded, readJson } from '../../../../lib/server/http';
import type { DropCandidate } from '../../../../lib/cg/drops-model';
import type { QlooEntity } from '../../../../lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SA_MUSIC_TAG = 'urn:tag:genre:music:south_africa';

/**
 * Candidates for one person's taste drops: artists and films Qloo links to their favourites (and,
 * if they want, South African artists), each with Qloo's affinity. Ranking happens on the phone.
 */
export async function POST(request: NextRequest) {
  return guarded(
    request,
    'drops',
    async () => {
      const body = (await readJson(request, 8_000)) as { signals?: unknown; includeLocal?: unknown };
      const signals = Array.from(new Set((Array.isArray(body?.signals) ? body.signals : []).map(cleanId).filter(Boolean) as string[])).slice(0, 6);
      if (!signals.length) throw new InputError('Add a favourite first.');
      const joined = signals.join(',');
      const local = body?.includeLocal !== false;
      const [artists, sa, films] = await Promise.all([
        qlooRelated(joined, 'urn:entity:artist', { take: 20 }),
        local ? qlooRelated(joined, 'urn:entity:artist', { take: 10, tags: SA_MUSIC_TAG }) : Promise.resolve(null),
        qlooRelated(joined, 'urn:entity:movie', { take: 12 })
      ]);
      const saIds = new Set((sa?.data || []).map((e) => e.id));
      const out = new Map<string, DropCandidate>();
      const add = (e: QlooEntity) => {
        if (signals.includes(e.id) || out.has(e.id)) return;
        out.set(e.id, {
          id: e.id,
          name: e.name,
          type: e.type,
          image: e.image,
          year: e.year,
          tags: (e.tags || []).slice(0, 12),
          affinity: typeof e.affinity === 'number' ? e.affinity : 0.5,
          popularity: e.popularity,
          local: saIds.has(e.id),
          spotifyId: e.external?.spotifyId,
          netflixId: e.external?.netflixId
        });
      };
      [...(sa?.data || []), ...artists.data, ...films.data].forEach(add);
      const source = [artists.source, films.source].includes('live') ? 'live' : artists.source;
      if (!out.size) return NextResponse.json({ error: 'Qloo didn’t return anything just now. Try again in a minute.' }, { status: 503 });
      return NextResponse.json({ candidates: Array.from(out.values()), source });
    },
    { bucket: 'drops', max: 40 }
  );
}
