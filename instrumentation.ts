/**
 * Runs once when the server starts.
 *
 * 1. Keep awake. On Render's free plan a service sleeps after ~15 minutes without traffic, and the
 *    next visitor waits up to a minute. On Render, the server visits its own public URL every 10
 *    minutes so it stays awake. Render sets RENDER_EXTERNAL_URL; set KEEP_AWAKE=false to turn off.
 * 2. Pre-warm. The Qloo hackathon API takes a few seconds per call, so the server plans the two
 *    example pairs once (Qloo only, no AI) to fill its private 6-hour cache, and again every 5 hours.
 *    Visitors who tap an example then wait mostly for the AI step. Set PREWARM=false to turn off.
 * Elsewhere (local dev, Vercel) neither runs unless PREWARM=true.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const g = globalThis as typeof globalThis & { __cgStarted?: boolean };
  if (g.__cgStarted) return;
  g.__cgStarted = true;

  const url = process.env.RENDER_EXTERNAL_URL;
  if (url && process.env.KEEP_AWAKE !== 'false') {
    const ping = async () => {
      try {
        await fetch(`${url.replace(/\/$/, '')}/api/status`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
      } catch {
        /* the next ping will try again */
      }
    };
    setInterval(ping, 10 * 60 * 1000);
    console.log(`[keep-awake] pinging ${url}/api/status every 10 minutes`);
  }

  const prewarm = process.env.PREWARM === 'true' || (!!url && process.env.PREWARM !== 'false');
  if (prewarm && process.env.QLOO_API_KEY) {
    // Call our own planning route (Qloo only), so the cache that fills is the one the routes use.
    const { SAMPLE_PAIRS } = await import('./lib/cg/samples');
    const base = `http://127.0.0.1:${process.env.PORT || 3000}`;
    const run = async () => {
      const t0 = Date.now();
      let ok = 0;
      for (const pair of SAMPLE_PAIRS) {
        try {
          const res = await fetch(`${base}/api/cg/plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session: pair.make(), noLlm: true }),
            signal: AbortSignal.timeout(60000)
          });
          if (res.ok) ok++;
        } catch {
          /* try again next time */
        }
      }
      console.log(JSON.stringify({ event: 'prewarm', pairs: SAMPLE_PAIRS.length, ok, ms: Date.now() - t0 }));
    };
    setTimeout(run, 8000);
    setInterval(run, 5 * 60 * 60 * 1000);
  }
}
