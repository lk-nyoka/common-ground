/**
 * Streams the agent's real steps to the browser as newline-delimited JSON, then the result.
 * Lines: {"type":"step","step":{...}} ... then {"type":"done","session":{...}} or {"type":"error","error":"..."}.
 * Names are never in a step sent to Qloo, but steps can mention names, which is fine: they go
 * only to the person who typed them.
 */
import type { AgentTraceStep } from '../types';
import { InputError } from '../cg/validate';

export function streamPlan(run: (onStep: (s: AgentTraceStep) => void) => Promise<unknown>): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
      try {
        const session = await run((step) => send({ type: 'step', step }));
        send({ type: 'done', session });
      } catch (err: any) {
        const known = err instanceof InputError;
        if (!known) console.error(JSON.stringify({ event: 'stream_failed', message: String(err?.message || err).slice(0, 300) }));
        send({ type: 'error', error: known ? err.message : 'Something went wrong while planning. Please try again.' });
      } finally {
        controller.close();
      }
    }
  });
  return new Response(body, {
    headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' }
  });
}
