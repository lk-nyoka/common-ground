import { NextRequest } from 'next/server';
import { actOnPair, getPair, PAIR_ID, pairView, subscribePair, type Who } from '../../../../../lib/server/pairs';
import { clientKey, rateLimited } from '../../../../../lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_STREAM_MS = 10 * 60 * 1000; // the browser reconnects by itself after this

/** Server-sent events: the space each time it changes (new message, the other person arriving, a plan). */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (rateLimited(`pairsse:${clientKey(request)}`, 120) !== null) return new Response('Too many connections', { status: 429 });
  if (!PAIR_ID.test(params.id) || !getPair(params.id)) return new Response('Not found', { status: 404 });
  const who: Who = new URL(request.url).searchParams.get('p') === 'b' ? 'b' : 'a';
  const enc = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`event: pair\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          stop();
        }
      };
      const unsubscribe = subscribePair(params.id, (p) => send(pairView(p)));
      const hello = () => {
        try {
          actOnPair(params.id, { type: 'hello', who });
        } catch {
          stop();
        }
      };
      hello();
      const ping = setInterval(hello, 20_000);
      const limit = setTimeout(() => stop(), MAX_STREAM_MS);
      function stop() {
        if (closed) return;
        closed = true;
        clearInterval(ping);
        clearTimeout(limit);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
      cleanup = stop;
      request.signal.addEventListener('abort', stop);
    },
    cancel() {
      cleanup();
    }
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-store, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' }
  });
}
