'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Bell, BellOff, Brain, Compass, Heart, Play, SkipForward, X } from 'lucide-react';
import { Art, Mark, typeLabel } from '../../components/cg/ui';
import {
  FEATURES,
  learnedSummary,
  loadModel,
  markShown,
  rankDrops,
  update,
  type DropCandidate,
  type DropModel,
  type RankedDrop
} from '../../lib/cg/drops-model';
import { decodeProfile, type DropsProfile } from '../../lib/cg/drops-profile';

const PROFILE_KEY = 'cg-drops-profile-v1';
const modelKey = (p: DropsProfile) => `cg-drops-model-v1:${p.signals.map((s) => s.id).join(',')}`;
const PUSH_KEY = 'cg-drops-push-v1';
const img = (u?: string) => (u ? `/api/img?u=${encodeURIComponent(u)}` : undefined);

const store = {
  get<T>(k: string): T | null {
    try {
      const v = localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : null;
    } catch {
      return null;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* private mode: the model just won't persist */
    }
  }
};

function urlB64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export default function DropsPage() {
  const [profile, setProfile] = useState<DropsProfile | null | undefined>(undefined);
  const [model, setModel] = useState<DropModel | null>(null);
  const [candidates, setCandidates] = useState<DropCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [seed, setSeed] = useState(0); // a new Thompson draw after each reaction

  // Who this is for: from the link, or from the last visit on this phone.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const fromLink = hash.get('p') ? decodeProfile(hash.get('p')!) : null;
    if (hash.get('d')) setFocusId(hash.get('d'));
    const p = fromLink || store.get<DropsProfile>(PROFILE_KEY);
    if (fromLink) {
      store.set(PROFILE_KEY, fromLink);
      history.replaceState(null, '', '/drops' + (hash.get('d') ? `#d=${hash.get('d')}` : ''));
    }
    setProfile(p || null);
    if (p) setModel(loadModel(store.get(modelKey(p))));
  }, []);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    fetch('/api/cg/drops', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signals: profile.signals.map((s) => s.id), includeLocal: profile.local })
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Couldn’t load drops.');
        if (!cancelled) setCandidates(j.candidates);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const save = useCallback(
    (m: DropModel) => {
      setModel(m);
      if (profile) store.set(modelKey(profile), m);
    },
    [profile]
  );

  const ranked = useMemo(() => {
    if (!model || !candidates) return [];
    const r = rankDrops(model, candidates);
    if (focusId) {
      const i = r.findIndex((d) => d.candidate.id === focusId);
      if (i > 0) r.unshift(...r.splice(i, 1));
    }
    return r;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, candidates, seed, focusId]);

  const drop = ranked[0];
  const react = (y: 0 | 1 | null) => {
    if (!drop || !model) return;
    const item = { id: drop.candidate.id, name: drop.candidate.name, tags: drop.candidate.tags };
    save(y === null ? markShown(model, item.id) : update(model, drop.features, y, item));
    setFocusId(null);
    setSeed((s) => s + 1);
  };

  if (profile === undefined) return <Shell><p className="text-muted">Loading…</p></Shell>;
  if (!profile)
    return (
      <Shell>
        <div className="rounded-3xl border border-line bg-card p-6">
          <h1 className="font-display text-2xl font-semibold">Taste drops</h1>
          <p className="mt-2 text-muted">Make a plan first, then tap “Taste drops” under your name. Drops are built from your own favourites.</p>
          <Link href="/" className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 font-medium text-white">
            Make a plan
          </Link>
        </div>
      </Shell>
    );

  return (
    <Shell>
      <header>
        <p className="text-sm text-muted">Taste drops for</p>
        <h1 className="font-display text-3xl font-semibold leading-tight">{profile.name}</h1>
        <p className="mt-1 text-sm text-muted">From {profile.signals.map((s) => s.name).join(', ')}. A model on this phone learns what you actually try.</p>
      </header>

      <div className="mt-5">
        {error && !candidates && (
          <p className="rounded-2xl bg-a-soft px-4 py-3 text-sm text-a-ink" role="alert">
            {error}
          </p>
        )}
        {!error && !candidates && (
          <div className="h-[520px] animate-pulse rounded-3xl bg-card" role="status" aria-label="Asking Qloo for candidates" />
        )}
        {candidates && !drop && (
          <div className="rounded-3xl border border-line bg-card p-6">
            <p className="font-display text-xl font-semibold">You’ve seen every drop in this batch</p>
            <p className="mt-1 text-muted">Like a few more things in your plans and new drops open up.</p>
          </div>
        )}
        {drop && <DropCard drop={drop} onReact={react} />}
      </div>

      {model && <Learned model={model} />}
      {model && candidates && <Notify profile={profile} ranked={ranked} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-12 pt-5">
      <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold">
        <Mark size={18} /> Common Ground
      </Link>
      {children}
    </main>
  );
}

function DropCard({ drop, onReact }: { drop: RankedDrop; onReact: (y: 0 | 1 | null) => void }) {
  const c = drop.candidate;
  const isArtist = c.type.includes('artist');
  const [player, setPlayer] = useState(false);
  useEffect(() => setPlayer(false), [c.id]);
  return (
    <article className="overflow-hidden rounded-3xl bg-ink text-white shadow-lg" aria-live="polite">
      <div className="relative h-72">
        <Art src={img(c.image)} type={c.type} alt="" className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" aria-hidden />
        <div className="absolute left-4 top-4 flex gap-2">
          <span className="rounded-full bg-black/50 px-3 py-1 text-xs font-semibold backdrop-blur">Try this</span>
          {drop.exploring && (
            <span className="inline-flex items-center gap-1 rounded-full bg-shared px-3 py-1 text-xs font-semibold">
              <Compass className="h-3.5 w-3.5" aria-hidden /> Exploring
            </span>
          )}
          {c.local && <span className="rounded-full bg-[#FFB81C] px-3 py-1 text-xs font-semibold text-black">Mzansi</span>}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
            {typeLabel(c.type)}
            {c.year ? ` · ${c.year}` : ''}
          </p>
          <h2 className="mt-1 font-display text-3xl font-semibold leading-tight">{c.name}</h2>
        </div>
      </div>
      <div className="p-5 pt-3">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15" aria-hidden>
            <div className="h-full rounded-full bg-gradient-to-r from-a to-b" style={{ width: `${Math.round(drop.p * 100)}%` }} />
          </div>
          <p className="text-sm tabular-nums text-white/80">{Math.round(drop.p * 100)}% you’ll try it</p>
        </div>
        <p className="mt-1 text-xs text-white/50">
          {drop.exploring
            ? 'Not its safest guess: it’s testing something it’s less sure about, so it learns faster.'
            : 'Its best guess for you right now.'}
        </p>
        {drop.reasons.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm text-white/85">
            {drop.reasons.map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden>·</span>
                <span>{r[0].toUpperCase() + r.slice(1)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4">
          {isArtist && c.spotifyId ? (
            player ? (
              <iframe
                title={`${c.name} on Spotify`}
                src={`https://open.spotify.com/embed/artist/${c.spotifyId}?utm_source=generator&theme=0`}
                width="100%"
                height="152"
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                className="rounded-xl border-0"
              />
            ) : (
              <button type="button" onClick={() => setPlayer(true)} className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#1DB954] px-4 text-sm font-semibold text-black">
                <Play className="h-4 w-4" aria-hidden /> Play a preview
              </button>
            )
          ) : (
            <div className="flex flex-wrap gap-2">
              {c.netflixId && (
                <a href={`https://www.netflix.com/title/${c.netflixId}`} target="_blank" rel="noreferrer" className="inline-flex min-h-[40px] items-center gap-1 rounded-full bg-white px-4 text-sm font-semibold text-ink">
                  Netflix <ArrowUpRight className="h-4 w-4" aria-hidden />
                </a>
              )}
              <a
                href={isArtist ? `https://open.spotify.com/search/${encodeURIComponent(c.name)}` : `https://www.justwatch.com/za/search?q=${encodeURIComponent(c.name)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-white/30 px-4 text-sm font-medium"
              >
                {isArtist ? 'Find on Spotify' : 'Where to stream'} <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          )}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <button type="button" onClick={() => onReact(0)} className="inline-flex min-h-[48px] items-center justify-center gap-1 rounded-2xl border border-white/20 text-sm font-medium">
            <X className="h-4 w-4" aria-hidden /> Not for me
          </button>
          <button type="button" onClick={() => onReact(null)} className="inline-flex min-h-[48px] items-center justify-center gap-1 rounded-2xl border border-white/20 text-sm font-medium text-white/70">
            <SkipForward className="h-4 w-4" aria-hidden /> Later
          </button>
          <button type="button" onClick={() => onReact(1)} className="inline-flex min-h-[48px] items-center justify-center gap-1 rounded-2xl bg-a text-sm font-semibold">
            <Heart className="h-4 w-4" aria-hidden /> I’d try it
          </button>
        </div>
      </div>
    </article>
  );
}

const LABELS: Record<string, string> = {
  affinity: 'Qloo affinity',
  rank: 'Closest in batch',
  local: 'South African',
  artist: 'Music',
  film: 'Films',
  tagMatch: 'Tags you liked',
  popularity: 'Crowd favourites',
  novelty: 'Discoveries'
};

function Learned({ model }: { model: DropModel }) {
  const [open, setOpen] = useState(false);
  const rows = FEATURES.map((k, i) => ({ k, w: model.mean[i], sd: 1 / Math.sqrt(model.precision[i]) })).filter((r) => r.k !== 'bias');
  const max = Math.max(2.5, ...rows.map((r) => Math.abs(r.w) + r.sd));
  return (
    <section className="mt-5 rounded-3xl border border-line bg-card p-5">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 font-semibold">
          <Brain className="h-5 w-5 text-shared" aria-hidden /> What it has learned about you
        </span>
        <span className="text-sm text-muted">{open ? 'Hide' : 'Show'}</span>
      </button>
      <ul className="mt-2 space-y-1 text-sm">
        {learnedSummary(model).map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      {open && (
        <>
          <p className="mt-4 text-xs text-muted">
            Each bar is how much a signal pushes a drop up (right) or down (left) for you. The pale band is its uncertainty; it narrows as you react. The next drop is chosen by
            drawing once from these ranges (Thompson sampling), so it mostly picks safe bets and sometimes explores.
          </p>
          <ul className="mt-3 space-y-2">
            {rows.map((r) => {
              const pct = (v: number) => 50 + (v / max) * 50;
              const lo = pct(r.w - r.sd);
              const hi = pct(r.w + r.sd);
              return (
                <li key={r.k} className="grid grid-cols-[110px_1fr] items-center gap-2 text-xs">
                  <span className="text-muted">{LABELS[r.k]}</span>
                  <span className="relative h-3 rounded-full bg-paper">
                    <span className="absolute inset-y-0 left-1/2 w-px bg-line" aria-hidden />
                    <span className="absolute inset-y-0 rounded-full bg-shared/20" style={{ left: `${Math.max(0, lo)}%`, width: `${Math.min(100, hi) - Math.max(0, lo)}%` }} />
                    <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-shared" style={{ left: `${pct(r.w)}%` }} />
                  </span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs text-muted">Stored only on this phone. Clearing your browser data resets it.</p>
        </>
      )}
    </section>
  );
}

type PushState = { on: boolean; hour: number; key?: string };

function Notify({ profile, ranked }: { profile: DropsProfile; ranked: RankedDrop[] }) {
  const [state, setState] = useState<PushState>({ on: false, hour: 19 });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const ios = typeof navigator !== 'undefined' && /iPhone|iPad/.test(navigator.userAgent);
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as any).standalone);

  const queue = useCallback(
    () =>
      ranked.slice(0, 7).map((d) => ({
        title: `${profile.name}, try ${d.candidate.name}`,
        body: d.reasons[0] ? d.reasons[0][0].toUpperCase() + d.reasons[0].slice(1) + '.' : `A ${typeLabel(d.candidate.type).toLowerCase()} picked for your taste.`,
        url: `/drops#d=${encodeURIComponent(d.candidate.id)}`,
        image: d.candidate.image,
        tag: 'taste-drop'
      })),
    [ranked, profile.name]
  );

  const subscription = useCallback(async () => {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const { publicKey } = await fetch('/api/push').then((r) => r.json());
    let sub = await reg.pushManager.getSubscription();
    const saved = store.get<PushState>(PUSH_KEY);
    // The server's key can change on restart; an old subscription then has to be replaced.
    if (sub && saved?.key && saved.key !== publicKey) {
      await sub.unsubscribe();
      sub = null;
    }
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(publicKey) });
    return { sub, publicKey };
  }, []);

  const post = (body: Record<string, unknown>) =>
    fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(async (r) => {
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'The notification didn’t go through.');
      return j;
    });

  const schedule = useCallback(
    async (hour: number) => {
      const { sub, publicKey } = await subscription();
      const j = await post({ action: 'daily', subscription: sub.toJSON(), queue: queue(), hour, tzOffsetMin: -new Date().getTimezoneOffset() });
      const next: PushState = { on: true, hour, key: publicKey };
      store.set(PUSH_KEY, next);
      setState(next);
      return j.nextAt as number;
    },
    [subscription, queue]
  );

  // Refresh the queue on every visit, so the server always holds this phone's latest picks.
  useEffect(() => {
    const saved = store.get<PushState>(PUSH_KEY);
    if (saved) setState(saved);
    if (saved?.on && supported && Notification.permission === 'granted' && ranked.length) schedule(saved.hour).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ranked.length > 0]);

  const ask = async () => {
    const perm = await Notification.requestPermission().catch(() => 'denied' as NotificationPermission);
    if (perm !== 'granted') {
      throw new Error('Notifications are blocked for this site. Allow them in your browser settings to get drops.');
    }
  };

  const turnOn = async (hour = state.hour) => {
    setBusy(true);
    setMsg(null);
    try {
      await ask();
      const nextAt = await schedule(hour);
      setMsg(`Next drop: ${new Date(nextAt).toLocaleString([], { weekday: 'long', hour: '2-digit', minute: '2-digit' })}.`);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await post({ action: 'unsubscribe', subscription: sub.toJSON() }).catch(() => {});
        await sub.unsubscribe();
      }
      const next = { ...state, on: false };
      store.set(PUSH_KEY, next);
      setState(next);
      setMsg('Drops are off.');
    } finally {
      setBusy(false);
    }
  };

  const now = async () => {
    setBusy(true);
    setMsg(null);
    try {
      await ask();
      const { sub } = await subscription();
      await post({ action: 'now', subscription: sub.toJSON(), queue: queue() });
      setMsg('Sent. It should arrive in a few seconds.');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-4 rounded-3xl border border-line bg-card p-5">
      <p className="flex items-center gap-2 font-semibold">
        <Bell className="h-5 w-5 text-a" aria-hidden /> A drop a day
      </p>
      <p className="mt-1 text-sm text-muted">One notification at a time you choose, with this phone’s best pick. No account needed.</p>
      {!supported ? (
        <p className="mt-3 text-sm">
          {ios && !standalone
            ? 'On iPhone, add Common Ground to your Home Screen first (Share, then “Add to Home Screen”), then open it from there.'
            : 'This browser doesn’t support notifications. You can still come back here for drops.'}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="text-sm">
            <span className="sr-only">Time</span>
            <select
              value={state.hour}
              onChange={(e) => {
                const hour = Number(e.target.value);
                setState((s) => ({ ...s, hour }));
                if (state.on) turnOn(hour);
              }}
              className="min-h-[40px] rounded-full border border-line bg-card px-3"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </label>
          {state.on ? (
            <button type="button" disabled={busy} onClick={turnOff} className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-4 text-sm font-medium">
              <BellOff className="h-4 w-4" aria-hidden /> Turn off
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => turnOn()} className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-ink px-4 text-sm font-medium text-white">
              <Bell className="h-4 w-4" aria-hidden /> Turn on daily drops
            </button>
          )}
          <button type="button" disabled={busy || !ranked.length} onClick={now} className="inline-flex min-h-[40px] items-center rounded-full border border-line px-4 text-sm font-medium">
            Send me one now
          </button>
        </div>
      )}
      {msg && (
        <p className="mt-2 text-sm" role="status">
          {msg}
        </p>
      )}
      <p className="mt-3 text-xs text-muted">The server keeps only the push address and the next few drop titles, in memory. If the app restarts, opening this page sets it up again.</p>
    </section>
  );
}
