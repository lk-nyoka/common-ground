import { NextRequest, NextResponse } from 'next/server';
import { createPair } from '../../../lib/server/pairs';
import { cleanText } from '../../../lib/cg/validate';
import { guarded, readJson } from '../../../lib/server/http';

export const dynamic = 'force-dynamic';

/** Start a pair space for an invite. Returns its id, which travels inside the invite link. */
export async function POST(request: NextRequest) {
  return guarded(
    request,
    'pair_create',
    async () => {
      const body = (await readJson(request, 2_000)) as { names?: unknown };
      const names = Array.isArray(body?.names) ? body.names : [];
      const pair = createPair([cleanText(names[0], 24) || 'You', cleanText(names[1], 24) || 'Them']);
      return NextResponse.json({ id: pair.id });
    },
    { bucket: 'pair', max: 40 }
  );
}
