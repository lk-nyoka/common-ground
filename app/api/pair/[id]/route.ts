import { NextRequest, NextResponse } from 'next/server';
import { actOnPair, getPair, MAX_MESSAGE, PAIR_ID, PairError, pairView, type PairAction } from '../../../../lib/server/pairs';
import { cleanSession, cleanText, InputError, LIMITS, trimForClient } from '../../../../lib/cg/validate';
import { guarded, readJson } from '../../../../lib/server/http';

export const dynamic = 'force-dynamic';

const gone = () => NextResponse.json({ error: 'This link has expired. Make a new plan to start again.' }, { status: 404 });

/** The space's state; with ?session=1, the latest shared plan as well. */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return guarded(
    request,
    'pair_get',
    async () => {
      const pair = PAIR_ID.test(params.id) ? getPair(params.id) : undefined;
      if (!pair) return gone();
      const withSession = new URL(request.url).searchParams.get('session') === '1';
      return NextResponse.json({ ...pairView(pair), session: withSession ? pair.session : undefined });
    },
    { bucket: 'pairread', max: 600 }
  );
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return guarded(
    request,
    'pair_act',
    async () => {
      if (!PAIR_ID.test(params.id)) throw new InputError('That link is not valid.');
      const body = (await readJson(request, LIMITS.bodyBytes)) as any;
      const who = body?.who === 'a' || body?.who === 'b' ? body.who : null;
      if (!who) throw new InputError('Who is this?');
      let action: PairAction;
      switch (body?.type) {
        case 'hello':
          action = { type: 'hello', who, name: cleanText(body.name, 24) || undefined };
          break;
        case 'planning':
          action = { type: 'planning', who };
          break;
        case 'session':
          action = { type: 'session', who, session: trimForClient(cleanSession(body.session)) };
          break;
        case 'message':
          if (typeof body.text !== 'string' || body.text.length > MAX_MESSAGE * 2) throw new InputError('That message is too long.');
          action = { type: 'message', who, text: body.text };
          break;
        default:
          throw new InputError('Unknown action.');
      }
      try {
        return NextResponse.json(pairView(actOnPair(params.id, action)));
      } catch (e) {
        if (e instanceof PairError) return e.message.includes('expired') ? gone() : NextResponse.json({ error: e.message }, { status: 400 });
        throw e;
      }
    },
    { bucket: 'pairact', max: 300 }
  );
}
