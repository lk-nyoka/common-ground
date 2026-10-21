import { NextRequest, NextResponse } from 'next/server';
import { cleanFeedback, feedbackSummary, saveFeedback } from '../../../lib/server/feedback';
import { InputError } from '../../../lib/cg/validate';
import { guarded, readJson } from '../../../lib/server/http';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  return guarded(
    request,
    'feedback',
    async () => {
      const f = cleanFeedback(await readJson(request, 4_000));
      if (!f) throw new InputError('Tap at least one answer first.');
      await saveFeedback(f);
      return NextResponse.json({ ok: true });
    },
    { bucket: 'feedback', max: 10 }
  );
}

/** The summary, for the app's owner only: needs FEEDBACK_KEY. */
export async function GET(request: NextRequest) {
  return guarded(
    request,
    'feedback_read',
    async () => {
      const key = process.env.FEEDBACK_KEY;
      const given = new URL(request.url).searchParams.get('key') || '';
      if (!key || given !== key) return NextResponse.json({ error: 'Not available.' }, { status: 404 });
      return NextResponse.json(feedbackSummary());
    },
    { bucket: 'feedbackread', max: 60 }
  );
}
