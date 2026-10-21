/**
 * Tester feedback: a few taps after a plan. No names, no favourites, no account.
 *
 * Where it goes:
 *  - always: one JSON log line (visible in Render's logs) and an in-memory list (lost on restart);
 *  - if FEEDBACK_WEBHOOK_URL is set: posted there too, so it survives restarts. A Discord webhook
 *    URL gets a readable message; any other URL (for example a Google Apps Script) gets the JSON.
 */
export interface Feedback {
  at: string;
  ease?: number; // 1-5: how easy setup was
  fit?: 'both' | 'one' | 'neither'; // did tonight's picks suit both people
  liked: string[]; // parts they liked
  again?: 'yes' | 'maybe' | 'no';
  comment?: string;
  context: { planNumber?: number; sample?: boolean; planner?: string; mobile?: boolean; page?: string };
}

export const PARTS = ['proof', 'mzansi', 'stories', 'room', 'swaps', 'links', 'none'] as const;
const MAX_KEPT = 1000;
const kept: Feedback[] = [];

const isObj = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);

export function cleanFeedback(v: unknown, now = new Date()): Feedback | null {
  if (!isObj(v)) return null;
  const ease = Number.isInteger(v.ease) && v.ease >= 1 && v.ease <= 5 ? v.ease : undefined;
  const fit = ['both', 'one', 'neither'].includes(v.fit) ? v.fit : undefined;
  const again = ['yes', 'maybe', 'no'].includes(v.again) ? v.again : undefined;
  const liked = Array.isArray(v.liked) ? Array.from(new Set(v.liked.filter((p: unknown) => (PARTS as readonly string[]).includes(p as string)))) as string[] : [];
  const comment =
    typeof v.comment === 'string'
      ? v.comment.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 600) || undefined
      : undefined;
  const c = isObj(v.context) ? v.context : {};
  const context = {
    planNumber: Number.isInteger(c.planNumber) && c.planNumber > 0 && c.planNumber < 100 ? c.planNumber : undefined,
    sample: typeof c.sample === 'boolean' ? c.sample : undefined,
    planner: c.planner === 'llm' || c.planner === 'rules' ? c.planner : undefined,
    mobile: typeof c.mobile === 'boolean' ? c.mobile : undefined,
    page: typeof c.page === 'string' && /^[a-z/]{1,20}$/.test(c.page) ? c.page : undefined
  };
  if (ease === undefined && !fit && !again && !liked.length && !comment) return null;
  return { at: now.toISOString(), ease, fit, liked, again, comment, context };
}

const LABEL: Record<string, string> = { proof: 'the proof', mzansi: 'Mzansi match', stories: 'story cards', room: 'swipe room', swaps: 'swaps', links: 'where to watch', none: 'nothing yet' };

export function discordText(f: Feedback): string {
  const stars = f.ease ? '★'.repeat(f.ease) + '☆'.repeat(5 - f.ease) : 'n/a';
  return [
    `**New Common Ground feedback**`,
    `Ease: ${stars}  ·  Picks: ${f.fit || 'n/a'}  ·  Use again: ${f.again || 'n/a'}`,
    f.liked.length ? `Liked: ${f.liked.map((l) => LABEL[l] || l).join(', ')}` : '',
    f.comment ? `> ${f.comment}` : '',
    `_plan ${f.context.planNumber ?? '?'}${f.context.sample ? ', example pair' : ''}${f.context.mobile ? ', phone' : ''}_`
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, 1900);
}

export async function saveFeedback(f: Feedback): Promise<{ forwarded: boolean }> {
  kept.push(f);
  if (kept.length > MAX_KEPT) kept.shift();
  console.log(JSON.stringify({ event: 'feedback', ...f }));
  const url = process.env.FEEDBACK_WEBHOOK_URL;
  if (!url || !/^https:\/\//.test(url)) return { forwarded: false };
  const discord = /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discord ? { content: discordText(f), allowed_mentions: { parse: [] } } : f),
      signal: AbortSignal.timeout(6000),
      redirect: 'follow'
    });
    return { forwarded: res.ok };
  } catch {
    console.error(JSON.stringify({ event: 'feedback_forward_failed' }));
    return { forwarded: false };
  }
}

export function feedbackSummary() {
  const n = kept.length;
  const avg = (xs: number[]) => (xs.length ? +(xs.reduce((s, x) => s + x, 0) / xs.length).toFixed(2) : null);
  const count = <T extends string>(xs: (T | undefined)[]) => xs.reduce((m, x) => (x ? { ...m, [x]: (m[x] || 0) + 1 } : m), {} as Record<string, number>);
  return {
    responses: n,
    meanEase: avg(kept.map((f) => f.ease).filter((x): x is number => typeof x === 'number')),
    picks: count(kept.map((f) => f.fit)),
    again: count(kept.map((f) => f.again)),
    liked: count(kept.flatMap((f) => f.liked)),
    comments: kept.filter((f) => f.comment).map((f) => ({ at: f.at, comment: f.comment! })).reverse(),
    note: 'Kept in memory since the server last started. Set FEEDBACK_WEBHOOK_URL to keep a permanent copy.'
  };
}

export function resetFeedback() {
  kept.length = 0;
}
