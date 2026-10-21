'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Copy, Heart, Pause, Play, Share2, Square, X } from 'lucide-react';
import { Art, Mark, typeLabel } from '../../../components/cg/ui';
import type { PublicRoom } from '../../../lib/server/room-view';
import type { RoomItem } from '../../../lib/server/rooms';

const EMOJI = ['😂', '😍', '😱', '👏', '🔥', '😭'];
const img = (u?: string) => (u ? `/api/img?u=${encodeURIComponent(u)}` : undefined);
type Tab = 'swipe' | 'matches' | 'party';

function useRoom(id: string, who: 'a' | 'b') {
  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const offset = useRef(0); // server clock minus this phone's clock
  const latest = useRef(0);

  const take = useCallback((r: PublicRoom) => {
    if (r.version < latest.current) return; // an older update arriving late
    latest.current = r.version;
    offset.current = r.serverNow - Date.now();
    setRoom(r);
  }, []);

  useEffect(() => {
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let fails = 0;
    const fetchOnce = () =>
      fetch(`/api/room/${id}`)
        .then(async (res) => {
          const j = await res.json();
          if (!res.ok) throw new Error(j.error || 'This room is not available.');
          take(j);
        })
        .catch((e) => setError(e.message));
    fetchOnce();
    if (typeof EventSource !== 'undefined') {
      es = new EventSource(`/api/room/${id}/events?p=${who}`);
      es.addEventListener('room', (ev) => {
        fails = 0;
        take(JSON.parse((ev as MessageEvent).data));
      });
      es.onerror = () => {
        // The browser retries by itself; if it keeps failing, fall back to checking every few seconds.
        if (++fails >= 3 && !poll) poll = setInterval(fetchOnce, 3000);
      };
    } else poll = setInterval(fetchOnce, 3000);
    return () => {
      es?.close();
      if (poll) clearInterval(poll);
    };
  }, [id, who, take]);

  const send = useCallback(
    async (action: Record<string, unknown>) => {
      const res = await fetch(`/api/room/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...action, who }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) setError(j.error || 'That didn’t go through. Try again.');
      else take(j);
    },
    [id, who, take]
  );

  return { room, error, send, serverNow: () => Date.now() + offset.current };
}

export default function RoomPage({ params, searchParams }: { params: { id: string }; searchParams: { p?: string } }) {
  const who: 'a' | 'b' = searchParams.p === 'b' ? 'b' : 'a';
  const other: 'a' | 'b' = who === 'a' ? 'b' : 'a';
  const { room, error, send, serverNow } = useRoom(params.id, who);
  const [tab, setTab] = useState<Tab>('swipe');
  const [celebrate, setCelebrate] = useState<RoomItem | null>(null);
  const seenMatches = useRef<Set<string> | null>(null);

  // "It's a match": show the overlay for matches that appear while this page is open.
  useEffect(() => {
    if (!room) return;
    if (!seenMatches.current) {
      seenMatches.current = new Set(room.matches);
      return;
    }
    const fresh = room.matches.find((m) => !seenMatches.current!.has(m));
    room.matches.forEach((m) => seenMatches.current!.add(m));
    if (fresh) {
      setCelebrate(room.items.find((i) => i.id === fresh) || null);
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate?.([60, 40, 60]);
    }
  }, [room]);

  // Jump to the party when either person starts one.
  const partyKey = room?.party ? `${room.party.itemId}:${room.party.startAt}` : '';
  useEffect(() => {
    if (partyKey && room?.party?.state !== 'ended') {
      setTab('party');
      setCelebrate(null); // the other person already chose to watch
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyKey]);

  if (error && !room)
    return (
      <Shell>
        <div className="rounded-3xl border border-line bg-card p-6">
          <h1 className="font-display text-2xl font-semibold">This room isn’t available</h1>
          <p className="mt-2 text-muted">{error}</p>
          <p className="mt-2 text-sm text-muted">Rooms live for 24 hours and reset when the app is updated.</p>
          <Link href="/" className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 font-medium text-white">
            Make a new plan
          </Link>
        </div>
      </Shell>
    );
  if (!room)
    return (
      <Shell>
        <p className="text-muted" role="status">
          Opening the room…
        </p>
      </Shell>
    );

  const me = room.names[who === 'a' ? 0 : 1];
  const them = room.names[who === 'a' ? 1 : 0];
  const matches = room.matches.map((m) => room.items.find((i) => i.id === m)).filter(Boolean) as RoomItem[];

  return (
    <Shell>
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Live room</p>
          <h1 className="font-display text-2xl font-semibold leading-tight">
            <span className="text-a">{room.names[0]}</span> <span className="text-muted">&amp;</span> <span className="text-b">{room.names[1]}</span>
          </h1>
        </div>
        <Presence name={them} online={room.online[other]} />
      </header>

      {who === 'a' && !room.online.b && <Invite id={room.id} them={them} />}
      <p className="mt-3 text-sm text-muted">
        Only one phone to hand?{' '}
        <a href={`/room/${room.id}${who === 'a' ? '?p=b' : ''}`} target="_blank" rel="noreferrer" className="font-medium text-shared-ink underline underline-offset-2">
          Open {them}’s side in a new tab
        </a>{' '}
        and play both.
      </p>

      <nav className="mt-4 grid grid-cols-3 gap-1 rounded-full bg-card p-1 text-sm font-medium shadow-sm" aria-label="Room">
        {(
          [
            ['swipe', 'Swipe'],
            ['matches', `Matches${matches.length ? ` (${matches.length})` : ''}`],
            ['party', 'Start together']
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            aria-current={tab === k}
            className={`min-h-[40px] rounded-full px-2 ${tab === k ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {error && (
        <p className="mt-3 rounded-2xl bg-a-soft px-4 py-2 text-sm text-a-ink" role="alert">
          {error}
        </p>
      )}

      <div className="mt-4">
        {tab === 'swipe' && <Deck room={room} who={who} me={me} them={them} send={send} onDone={() => setTab('matches')} />}
        {tab === 'matches' && <Matches room={room} items={matches} them={them} onWatch={(id) => send({ type: 'party_start', itemId: id })} />}
        {tab === 'party' && <PartyView room={room} who={who} them={them} send={send} serverNow={serverNow} matches={matches} />}
      </div>

      <p className="mt-8 text-center text-xs text-muted">
        No sign-up. This room keeps only your first names and tonight’s picks, in the server’s memory, for 24 hours.
      </p>

      {celebrate && <MatchOverlay item={celebrate} names={room.names} onClose={() => setCelebrate(null)} onWatch={() => { send({ type: 'party_start', itemId: celebrate.id }); setCelebrate(null); }} />}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-screen max-w-md px-4 pb-10 pt-5">
      <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold">
        <Mark size={18} /> Common Ground
      </Link>
      {children}
    </main>
  );
}

function Presence({ name, online }: { name: string; online: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1.5 text-sm shadow-sm" role="status">
      <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-emerald-500' : 'bg-line'}`} aria-hidden />
      {online ? `${name} is here` : `Waiting for ${name}`}
    </span>
  );
}

function Invite({ id, them }: { id: string; them: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/room/${id}?p=b` : '';
  const text = `Swipe on tonight's picks with me. When we both say yes, it's a match: ${url}`;
  return (
    <section className="mt-4 rounded-3xl bg-shared-soft p-4">
      <p className="font-medium">Send this room to {them}</p>
      <p className="mt-1 text-sm text-muted">You each swipe on your own phone. Picks you both like show up as matches straight away.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-black">
          <Share2 className="h-4 w-4" aria-hidden /> WhatsApp
        </a>
        <button
          type="button"
          onClick={async () => {
            try {
              if (navigator.share) await navigator.share({ title: 'Common Ground room', text, url });
              else {
                await navigator.clipboard.writeText(url);
                setCopied(true);
              }
            } catch {
              /* cancelled */
            }
          }}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-ink/15 bg-card px-4 text-sm font-medium"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />} {copied ? 'Copied' : 'Share link'}
        </button>
      </div>
    </section>
  );
}

function FitLine({ item, names }: { item: RoomItem; names: [string, string] }) {
  if (!item.of || (!item.rankA && !item.rankB)) return null;
  return (
    <p className="text-sm">
      {item.rankA ? (
        <span className="text-a-ink">
          #{item.rankA} for {names[0]}
        </span>
      ) : null}
      {item.rankA && item.rankB ? <span className="text-muted"> · </span> : null}
      {item.rankB ? (
        <span className="text-b-ink">
          #{item.rankB} for {names[1]}
        </span>
      ) : null}
      <span className="text-muted"> of {item.of} Qloo scored</span>
    </p>
  );
}

function Deck({ room, who, me, them, send, onDone }: { room: PublicRoom; who: 'a' | 'b'; me: string; them: string; send: (a: Record<string, unknown>) => void; onDone: () => void }) {
  const mine = room.swipes[who];
  const theirs = room.swipes[who === 'a' ? 'b' : 'a'];
  const left = room.items.filter((i) => !mine[i.id]);
  const card = left[0];
  const next = left[1];
  const [dx, setDx] = useState(0);
  const start = useRef<number | null>(null);
  const [leaving, setLeaving] = useState<'yes' | 'no' | null>(null);

  const decide = (value: 'yes' | 'no') => {
    if (!card || leaving) return;
    setLeaving(value);
    setTimeout(() => {
      send({ type: 'swipe', itemId: card.id, value });
      setLeaving(null);
      setDx(0);
    }, 180);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') decide('yes');
      if (e.key === 'ArrowLeft') decide('no');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const theirCount = Object.keys(theirs).length;
  if (!card)
    return (
      <div className="rounded-3xl border border-line bg-card p-6 text-center">
        <p className="font-display text-xl font-semibold">You’ve swiped all {room.items.length}</p>
        <p className="mt-1 text-muted">
          {theirCount >= room.items.length ? `${them} is done too.` : `${them} has swiped ${theirCount} of ${room.items.length}. Matches appear as they go.`}
        </p>
        <button type="button" onClick={onDone} className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 font-medium text-white">
          See matches ({room.matches.length})
        </button>
      </div>
    );

  const x = leaving === 'yes' ? 500 : leaving === 'no' ? -500 : dx;
  const tilt = x / 20;
  return (
    <div>
      <p className="mb-2 text-sm text-muted">
        {room.items.length - left.length + 1} of {room.items.length} · {me}, would you watch or play this tonight?
      </p>
      <div className="relative h-[460px] select-none">
        {next && (
          <div className="absolute inset-0 scale-[0.96] overflow-hidden rounded-3xl bg-card opacity-70 shadow-sm" aria-hidden>
            <Art src={img(next.image)} type={next.type} className="h-full w-full" />
          </div>
        )}
        <div
          className="absolute inset-0 touch-none overflow-hidden rounded-3xl bg-ink text-white shadow-lg"
          style={{ transform: `translateX(${x}px) rotate(${tilt}deg)`, transition: start.current === null ? 'transform 180ms ease-out' : 'none' }}
          onPointerDown={(e) => {
            start.current = e.clientX;
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          }}
          onPointerMove={(e) => start.current !== null && setDx(e.clientX - start.current)}
          onPointerUp={() => {
            const d = dx;
            start.current = null;
            if (d > 90) decide('yes');
            else if (d < -90) decide('no');
            else setDx(0);
          }}
          onPointerCancel={() => {
            start.current = null;
            setDx(0);
          }}
        >
          <Art src={img(card.image)} type={card.type} alt="" className="absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" aria-hidden />
          {dx > 40 && <span className="absolute left-5 top-5 rotate-[-12deg] rounded-xl border-4 border-emerald-400 px-3 py-1 font-display text-2xl font-bold text-emerald-300">YES</span>}
          {dx < -40 && <span className="absolute right-5 top-5 rotate-[12deg] rounded-xl border-4 border-rose-400 px-3 py-1 font-display text-2xl font-bold text-rose-300">NOPE</span>}
          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              {typeLabel(card.type)}
              {card.year ? ` · ${card.year}` : ''}
              {card.local ? ' · Mzansi' : ''}
            </p>
            <h2 className="mt-1 font-display text-3xl font-semibold leading-tight">{card.name}</h2>
            <div className="mt-2 [&_*]:!text-white/85">
              <FitLine item={card} names={room.names} />
            </div>
            {theirs[card.id] && <p className="mt-2 text-sm text-white/80">{them} has already swiped on this one.</p>}
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-center gap-6">
        <button type="button" onClick={() => decide('no')} aria-label={`No to ${card.name}`} className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-card text-rose-600 shadow-sm">
          <X className="h-8 w-8" aria-hidden />
        </button>
        <button type="button" onClick={() => decide('yes')} aria-label={`Yes to ${card.name}`} className="flex h-16 w-16 items-center justify-center rounded-full bg-a text-white shadow-md">
          <Heart className="h-8 w-8" aria-hidden />
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted">Drag the card, tap the buttons, or use the arrow keys. Yes means “I’d consider it tonight”. After you’ve watched, rate it on your plan so the next plan learns.</p>
    </div>
  );
}

function Matches({ room, items, them, onWatch }: { room: PublicRoom; items: RoomItem[]; them: string; onWatch: (id: string) => void }) {
  if (!items.length)
    return (
      <div className="rounded-3xl border border-line bg-card p-6">
        <p className="font-display text-xl font-semibold">No matches yet</p>
        <p className="mt-1 text-muted">When you and {them} both say yes to the same pick, it lands here for both of you, live.</p>
      </div>
    );
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i.id} className="flex items-center gap-3 rounded-3xl border border-line bg-card p-3">
          <Art src={img(i.image)} type={i.type} className="h-20 w-16 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-shared">It’s a match</p>
            <p className="truncate font-semibold">{i.name}</p>
            <FitLine item={i} names={room.names} />
          </div>
          <button type="button" onClick={() => onWatch(i.id)} className="inline-flex min-h-[40px] shrink-0 items-center gap-1 rounded-full bg-ink px-3 text-sm font-medium text-white">
            <Play className="h-4 w-4" aria-hidden /> {i.type.includes('artist') ? 'Listen' : 'Watch'}
          </button>
        </li>
      ))}
    </ul>
  );
}

function clockOf(room: PublicRoom, serverNow: number) {
  const p = room.party;
  if (!p) return null;
  if (p.state === 'countdown' || p.state === 'playing') {
    if (serverNow < p.startAt) return { state: 'countdown' as const, countdown: p.startAt - serverNow, elapsed: p.elapsedMs };
    return { state: 'playing' as const, countdown: 0, elapsed: p.elapsedMs + (serverNow - p.startAt) };
  }
  return { state: p.state, countdown: 0, elapsed: p.elapsedMs };
}

const hms = (ms: number) => {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h ? `${h}:` : ''}${String(m).padStart(h ? 2 : 1, '0')}:${String(sec).padStart(2, '0')}`;
};

function PartyView({ room, who, them, send, serverNow, matches }: { room: PublicRoom; who: 'a' | 'b'; them: string; send: (a: Record<string, unknown>) => void; serverNow: () => number; matches: RoomItem[] }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(t);
  }, []);
  const p = room.party;
  const item = p ? room.items.find((i) => i.id === p.itemId) : undefined;
  const clock = clockOf(room, serverNow());

  // Reactions from the last few seconds float up the screen.
  const fresh = room.reactions.filter((r) => serverNow() - r.at < 4000);

  if (!p || !item || p.state === 'ended') {
    const options = matches.length ? matches : room.items.slice(0, 6);
    return (
      <div className="rounded-3xl border border-line bg-card p-5">
        <p className="font-display text-xl font-semibold">Start together, even when you’re apart</p>
        <p className="mt-1 text-sm text-muted">
          Pick one and both phones count down to the same second. At zero you each press play yourselves: music plays in the Spotify player here, and for films you open your
          own streaming app. We can’t control Netflix or Spotify playback; the shared timer and “pause for both” keep you in step.
        </p>
        <p className="mt-4 text-sm font-medium">{matches.length ? 'Your matches' : 'Tonight’s picks'}</p>
        <ul className="mt-2 grid grid-cols-2 gap-2">
          {options.map((i) => (
            <li key={i.id}>
              <button type="button" onClick={() => send({ type: 'party_start', itemId: i.id })} className="flex w-full items-center gap-2 rounded-2xl border border-line p-2 text-left hover:border-ink/30">
                <Art src={img(i.image)} type={i.type} className="h-12 w-10 shrink-0 rounded-lg" />
                <span className="line-clamp-2 text-sm font-medium">{i.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const isArtist = item.type.includes('artist');
  const byName = p.by === who ? 'You' : them;
  return (
    <div className="relative overflow-hidden rounded-3xl bg-ink p-5 text-white">
      <div className="flex items-center gap-3">
        <Art src={img(item.image)} type={item.type} className="h-16 w-12 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-white/60">{isArtist ? 'Listening in step' : 'Watching in step'}</p>
          <p className="truncate font-display text-xl font-semibold">{item.name}</p>
        </div>
      </div>

      <div className="my-6 text-center" aria-live="polite">
        {clock?.state === 'countdown' ? (
          <>
            <p className="font-display text-[96px] font-bold leading-none">{Math.max(1, Math.ceil(clock.countdown / 1000))}</p>
            <p className="mt-2 text-white/70">Press play when this hits zero</p>
          </>
        ) : clock?.state === 'playing' ? (
          <>
            <p className="font-display text-6xl font-bold tabular-nums">{hms(clock.elapsed)}</p>
            <p className="mt-2 text-white/70">Playing together. If you drift, scrub to this time.</p>
          </>
        ) : (
          <>
            <p className="font-display text-6xl font-bold tabular-nums text-white/60">{hms(clock?.elapsed || 0)}</p>
            <p className="mt-2 text-white/70">{byName} paused. Pause yours too.</p>
          </>
        )}
      </div>

      {isArtist && item.spotifyId && (
        <iframe
          title={`${item.name} on Spotify`}
          src={`https://open.spotify.com/embed/artist/${item.spotifyId}?utm_source=generator&theme=0`}
          width="100%"
          height="152"
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          className="rounded-xl border-0"
        />
      )}
      {!isArtist && (
        <div className="flex flex-wrap justify-center gap-2">
          {item.netflixId && (
            <a href={`https://www.netflix.com/title/${item.netflixId}`} target="_blank" rel="noreferrer" className="inline-flex min-h-[40px] items-center gap-1 rounded-full bg-white px-4 text-sm font-semibold text-ink">
              Open on Netflix <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          )}
          <a href={`https://www.justwatch.com/za/search?q=${encodeURIComponent(item.name)}`} target="_blank" rel="noreferrer" className="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-white/30 px-4 text-sm font-medium">
            Where to stream <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
      )}

      <div className="mt-5 flex justify-center gap-3">
        {clock?.state === 'paused' ? (
          <button type="button" onClick={() => send({ type: 'party_resume' })} className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-white px-5 font-semibold text-ink">
            <Play className="h-5 w-5" aria-hidden /> Resume together
          </button>
        ) : (
          <button type="button" onClick={() => send({ type: 'party_pause' })} className="inline-flex min-h-[48px] items-center gap-2 rounded-full bg-white px-5 font-semibold text-ink">
            <Pause className="h-5 w-5" aria-hidden /> Pause for both
          </button>
        )}
        <button type="button" onClick={() => send({ type: 'party_end' })} aria-label="End" className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-white/30 px-4">
          <Square className="h-4 w-4" aria-hidden /> End
        </button>
      </div>

      <div className="mt-5 flex justify-center gap-2" aria-label="Send a reaction">
        {EMOJI.map((e) => (
          <button key={e} type="button" onClick={() => send({ type: 'react', emoji: e })} className="h-11 w-11 rounded-full bg-white/10 text-xl hover:bg-white/20" aria-label={`React ${e}`}>
            {e}
          </button>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {fresh.map((r, i) => (
          <span
            key={`${r.at}-${i}`}
            className="cg-float absolute bottom-24 text-4xl"
            style={{ left: `${r.who === 'a' ? 15 + (i % 3) * 8 : 65 + (i % 3) * 8}%` }}
          >
            {r.emoji}
          </span>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-white/50">
        {byName} {p.state === 'paused' ? 'paused' : 'started'} this. {room.online[who === 'a' ? 'b' : 'a'] ? `${them} is in the room.` : `${them} hasn’t opened the room yet.`}
      </p>
    </div>
  );
}

function MatchOverlay({ item, names, onClose, onWatch }: { item: RoomItem; names: [string, string]; onClose: () => void; onWatch: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-shared p-6 text-white" role="dialog" aria-modal="true" aria-label="It’s a match">
      <div className="w-full max-w-sm text-center">
        <p className="cg-pop font-display text-5xl font-bold">It’s a match</p>
        <p className="mt-2 text-white/80">
          {names[0]} and {names[1]} both said yes
        </p>
        <Art src={img(item.image)} type={item.type} className="mx-auto mt-6 h-64 w-44 rounded-2xl shadow-2xl" />
        <p className="mt-4 font-display text-2xl font-semibold">{item.name}</p>
        <div className="mt-6 flex flex-col gap-2">
          <button type="button" onClick={onWatch} className="min-h-[48px] rounded-full bg-white font-semibold text-shared-ink">
            Start together now
          </button>
          <button type="button" onClick={onClose} className="min-h-[44px] rounded-full border border-white/40">
            Keep swiping
          </button>
        </div>
      </div>
    </div>
  );
}
