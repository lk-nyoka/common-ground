import { NextRequest } from 'next/server';
import { guarded } from '../../../lib/server/http';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 3_000_000;

/**
 * Serves Qloo artwork from our own origin, so story cards can draw it onto a canvas and save it
 * as an image (browsers block that for images from other sites). Only Qloo's image host is allowed.
 */
async function handle(request: NextRequest): Promise<Response> {
  const raw = new URL(request.url).searchParams.get('u') || '';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new Response('Bad image address', { status: 400 });
  }
  if (url.protocol !== 'https:' || url.hostname !== 'images.qloo.com' || !url.pathname.startsWith('/i/')) {
    return new Response('Only Qloo images can be shown here', { status: 400 });
  }
  const upstream = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!upstream || !upstream.ok) return new Response('Image unavailable', { status: 502 });
  const type = upstream.headers.get('content-type') || '';
  if (!/^image\/(jpeg|png|webp|gif|avif)/.test(type)) return new Response('Not an image', { status: 502 });
  const buf = await upstream.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return new Response('Image too large', { status: 502 });
  return new Response(buf, {
    headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400, immutable', 'X-Content-Type-Options': 'nosniff' }
  });
}

export async function GET(request: NextRequest) {
  return guarded(request, 'img', () => handle(request), { bucket: 'img', max: 600 });
}
