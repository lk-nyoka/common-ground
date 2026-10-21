import { NextRequest } from 'next/server';
import { act, getRoom, subscribe, type Who } from '../../../../../lib/server/rooms';
import { publicRoom } from '../../../../../lib/server/room-view';
import { rateLimited, clientKey } from '../../../../../lib/server/http';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROOM_ID = /^[A-Za-z0-9_-]{8,20}$/;
const MAX_STREAM_MS = 10 * 60 * 1000; // the browser reconnects by itself after this

/** Server-sent events: every change to the room goes to both phones as it happens. */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (rateLimited(`roomsse:${clientKey(request)}`, 120) !== null) return new Response('Too many connections', { status: 429 });
  if (!ROOM_ID.test(params.id) || !getRoom(params.id)) return new Response('Room not found', { status: 404 });
  const p = new URL(request.url).searchParams.get('p');
  const who: Who = p === 'b' ? 'b' : 'a';
  const enc = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (data: unknown, event = 'room') => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          stop();
        }
      };
      const unsubscribe = subscribe(params.id, (room) => send(publicRoom(room)));
      // Mark this person as here, which also tells the other phone.
      try {
        act(params.id, { type: 'hello', who });
      } catch {
        /* expired between checks */
      }
      const r = getRoom(params.id);
      if (r) send(publicRoom(r));
      const ping = setInterval(() => {
        const room = getRoom(params.id);
        if (!room) return stop();
        try {
          act(params.id, { type: 'hello', who });
        } catch {
          stop();
        }
      }, 20_000);
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
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
