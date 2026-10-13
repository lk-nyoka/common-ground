/**
 * Runs once when the server starts.
 *
 * On Render's free plan a service sleeps after ~15 minutes without traffic, and the next
 * visitor waits up to a minute for it to wake. When running on Render, the server visits its
 * own public URL every 10 minutes so it stays awake. Render sets RENDER_EXTERNAL_URL itself;
 * set KEEP_AWAKE=false to turn this off. Elsewhere (local dev, Vercel) it does nothing.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const url = process.env.RENDER_EXTERNAL_URL;
  if (!url || process.env.KEEP_AWAKE === 'false') return;

  const g = globalThis as typeof globalThis & { __keepAwake?: ReturnType<typeof setInterval> };
  if (g.__keepAwake) return;

  const ping = async () => {
    try {
      await fetch(`${url.replace(/\/$/, '')}/api/status`, { cache: 'no-store', signal: AbortSignal.timeout(15000) });
    } catch {
      /* the next ping will try again */
    }
  };
  g.__keepAwake = setInterval(ping, 10 * 60 * 1000);
  console.log(`[keep-awake] pinging ${url}/api/status every 10 minutes`);
}
