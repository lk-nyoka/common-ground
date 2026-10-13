/** Shared helpers for API routes: body size limit, per-visitor rate limit, safe errors, logs. */
import { NextRequest, NextResponse } from 'next/server';
import { InputError } from '../cg/validate';

/** Read JSON with a size cap. */
export async function readJson(request: NextRequest, maxBytes: number): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new InputError('That request is too large.');
  const text = await request.text();
  if (text.length > maxBytes) throw new InputError('That request is too large.');
  try {
    return JSON.parse(text);
  } catch {
    throw new InputError('That request was not valid JSON.');
  }
}

/**
 * A simple per-visitor limit, kept in memory (one server instance), to protect the Qloo and
 * Gemini quotas from scripted abuse. Ordinary use makes a plan every few minutes at most.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = Number(process.env.PLAN_RATE_LIMIT || 20);
const hits = new Map<string, number[]>();

export function clientKey(request: NextRequest): string {
  const fwd = request.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0] : request.headers.get('x-real-ip') || 'local').trim();
}

export function rateLimited(key: string, max = MAX_PER_WINDOW): number | null {
  const now = Date.now();
  const recent = (hits.get(key) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= max) {
    hits.set(key, recent);
    return Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    hits.forEach((v, k) => {
      if (!v.some((t) => now - t < WINDOW_MS)) hits.delete(k);
    });
  }
  return null;
}

/** Wrap a route: rate limit, turn bad input into 400s, and never leak internals in a 500. */
export async function guarded(
  request: NextRequest,
  name: string,
  run: () => Promise<NextResponse>,
  opts: { bucket?: string; max?: number } = {}
): Promise<NextResponse> {
  const wait = rateLimited(`${opts.bucket || 'plan'}:${clientKey(request)}`, opts.max);
  if (wait !== null) {
    return NextResponse.json(
      { error: `That's a lot of plans in a short time. Please try again in about ${Math.ceil(wait / 60)} minute(s).` },
      { status: 429, headers: { 'Retry-After': String(wait) } }
    );
  }
  try {
    return await run();
  } catch (err: any) {
    if (err instanceof InputError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error(JSON.stringify({ event: `${name}_failed`, message: String(err?.message || err).slice(0, 300) }));
    return NextResponse.json({ error: 'Something went wrong while planning. Please try again.' }, { status: 500 });
  }
}

/** One log line per plan. No names or favourites: only what's needed to watch quality and speed. */
export function logPlan(name: string, startedAt: number, plan: { planner: string; plannerModel?: string; qlooStatus: string; number: number; notices: string[] } | undefined, picks: number) {
  console.log(
    JSON.stringify({
      event: name,
      ms: Date.now() - startedAt,
      planNumber: plan?.number,
      planner: plan?.planner,
      model: plan?.plannerModel,
      qloo: plan?.qlooStatus,
      picks,
      notices: plan?.notices.length || 0
    })
  );
}
