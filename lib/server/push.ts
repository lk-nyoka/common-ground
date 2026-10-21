/**
 * Web push for taste drops. The phone chooses the drops (its own model ranks them) and hands the
 * server a short queue; the server only delivers them at the chosen time. Subscriptions live in
 * memory: no accounts, no database, and they are lost on restart (the phone re-subscribes on its
 * next visit).
 */
import webpush from 'web-push';

export interface DropMessage {
  title: string;
  body: string;
  url: string; // a path on this site
  image?: string;
  tag?: string;
}

interface Entry {
  sub: webpush.PushSubscription;
  queue: DropMessage[];
  hour: number; // local hour for the daily drop
  tzOffsetMin: number; // minutes to add to UTC to get the phone's local time
  nextAt: number;
  createdAt: number;
}

const MAX_SUBS = 2000;
const subs = new Map<string, Entry>();
let keys: { publicKey: string; privateKey: string } | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

export function vapidKeys() {
  if (!keys) {
    const pub = process.env.VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    // Without saved keys the server makes a pair at start-up; phones re-subscribe when it changes.
    keys = pub && priv ? { publicKey: pub, privateKey: priv } : webpush.generateVAPIDKeys();
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hello@common-ground.app', keys.publicKey, keys.privateKey);
  }
  return keys;
}

/** The next time it is `hour`:00 on the phone's clock, as a UTC timestamp. */
export function nextLocalHour(now: number, hour: number, tzOffsetMin: number): number {
  const local = new Date(now + tzOffsetMin * 60_000);
  const target = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), hour, 0, 0);
  const t = target - tzOffsetMin * 60_000;
  return t > now + 60_000 ? t : t + 24 * 60 * 60 * 1000;
}

async function deliver(endpoint: string, e: Entry, msg: DropMessage) {
  try {
    await webpush.sendNotification(e.sub, JSON.stringify(msg), { TTL: 6 * 60 * 60, urgency: 'normal' });
    return true;
  } catch (err: any) {
    // 404/410: the phone unsubscribed or the subscription expired.
    if (err?.statusCode === 404 || err?.statusCode === 410) subs.delete(endpoint);
    console.error(JSON.stringify({ event: 'push_failed', status: err?.statusCode || 0 }));
    return false;
  }
}

async function tick() {
  const now = Date.now();
  for (const [endpoint, e] of Array.from(subs.entries())) {
    if (now < e.nextAt) continue;
    const msg = e.queue.shift();
    if (!msg) {
      subs.delete(endpoint); // nothing left to send; the phone refills the queue when it next opens the app
      continue;
    }
    e.nextAt = nextLocalHour(now, e.hour, e.tzOffsetMin);
    await deliver(endpoint, e, msg);
  }
}

function ensureTimer() {
  if (timer) return;
  timer = setInterval(() => void tick(), 60_000);
  (timer as any).unref?.();
}

export function subscribe(sub: webpush.PushSubscription, queue: DropMessage[], hour: number, tzOffsetMin: number) {
  vapidKeys();
  if (!subs.has(sub.endpoint) && subs.size >= MAX_SUBS) {
    const oldest = Array.from(subs.entries()).sort((x, y) => x[1].createdAt - y[1].createdAt)[0];
    if (oldest) subs.delete(oldest[0]);
  }
  const now = Date.now();
  subs.set(sub.endpoint, { sub, queue: queue.slice(0, 7), hour, tzOffsetMin, nextAt: nextLocalHour(now, hour, tzOffsetMin), createdAt: now });
  ensureTimer();
  return subs.get(sub.endpoint)!.nextAt;
}

export function unsubscribe(endpoint: string) {
  subs.delete(endpoint);
}

/** "Send me one now": delivers the first queued drop straight away. */
export async function sendNow(sub: webpush.PushSubscription, msg: DropMessage) {
  vapidKeys();
  const e: Entry = { sub, queue: [], hour: 19, tzOffsetMin: 0, nextAt: 0, createdAt: Date.now() };
  return deliver(sub.endpoint, e, msg);
}

export function pushStats() {
  return { subscriptions: subs.size };
}
