import { NextRequest, NextResponse } from 'next/server';
import { sendNow, subscribe, unsubscribe, vapidKeys, type DropMessage } from '../../../lib/server/push';
import { cleanText, InputError } from '../../../lib/cg/validate';
import { guarded, readJson } from '../../../lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Push services the browsers use. Anything else is refused, so this can't be used to call other sites.
const PUSH_HOSTS = /^(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]*\.push\.apple\.com|[a-z0-9.-]*\.notify\.windows\.com|[a-z0-9.-]*\.push\.services\.mozilla\.com)$/;

function cleanSub(v: any) {
  let url: URL;
  try {
    url = new URL(String(v?.endpoint || ''));
  } catch {
    throw new InputError('That notification subscription is not valid.');
  }
  if (url.protocol !== 'https:' || !PUSH_HOSTS.test(url.hostname)) throw new InputError('That notification service isn’t supported.');
  const p256dh = String(v?.keys?.p256dh || '');
  const auth = String(v?.keys?.auth || '');
  if (!/^[A-Za-z0-9_=-]{20,200}$/.test(p256dh) || !/^[A-Za-z0-9_=-]{8,100}$/.test(auth)) throw new InputError('That notification subscription is not valid.');
  return { endpoint: url.toString().slice(0, 1000), keys: { p256dh, auth } };
}

function cleanMsg(v: any): DropMessage | null {
  const title = cleanText(v?.title, 80);
  const body = cleanText(v?.body, 200);
  const url = typeof v?.url === 'string' && /^\/[A-Za-z0-9/_?=&#%.-]{0,300}$/.test(v.url) ? v.url : '/drops';
  if (!title) return null;
  const image = typeof v?.image === 'string' && /^https:\/\/images\.qloo\.com\//.test(v.image) ? v.image.slice(0, 500) : undefined;
  return { title, body, url, image, tag: cleanText(v?.tag, 60) || undefined };
}

export async function GET() {
  return NextResponse.json({ publicKey: vapidKeys().publicKey });
}

export async function POST(request: NextRequest) {
  return guarded(
    request,
    'push',
    async () => {
      const body = (await readJson(request, 12_000)) as any;
      const sub = cleanSub(body?.subscription);
      if (body?.action === 'unsubscribe') {
        unsubscribe(sub.endpoint);
        return NextResponse.json({ ok: true });
      }
      const queue = (Array.isArray(body?.queue) ? body.queue : []).slice(0, 7).map(cleanMsg).filter(Boolean) as DropMessage[];
      if (!queue.length) throw new InputError('There’s no drop to send yet.');
      if (body?.action === 'now') {
        const ok = await sendNow(sub, queue[0]);
        return NextResponse.json({ ok }, { status: ok ? 200 : 502 });
      }
      const hour = Number.isInteger(body?.hour) && body.hour >= 0 && body.hour <= 23 ? body.hour : 19;
      const tz = Number.isFinite(body?.tzOffsetMin) && Math.abs(body.tzOffsetMin) <= 14 * 60 ? Math.round(body.tzOffsetMin) : 0;
      const nextAt = subscribe(sub, queue, hour, tz);
      return NextResponse.json({ ok: true, nextAt, queued: queue.length });
    },
    { bucket: 'push', max: 30 }
  );
}
