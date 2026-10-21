'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Film, Link2, Loader2, Music2, Plus, Share2, Tv, X } from 'lucide-react';
import type { FavouriteType, Person, Session } from '../../lib/cg/types';
import { fav, newSession, person, SAMPLE_PAIRS } from '../../lib/cg/samples';
import { fold, nameFits } from '../../lib/cg/match';
import { type Invite, inviteUrl } from '../../lib/cg/invite';
import { Art, Mark, minutesLabel } from './ui';

// The same three slots, in the same order, for both people: so their answers line up.
const TYPES: { id: FavouriteType; label: string; ask: string; Icon: typeof Film; example: [string, string] }[] = [
  { id: 'urn:entity:movie', label: 'Film', ask: 'A film', Icon: Film, example: ['e.g. Black Panther', 'e.g. Tsotsi'] },
  { id: 'urn:entity:artist', label: 'Music', ask: 'An artist or band', Icon: Music2, example: ['e.g. Miriam Makeba', 'e.g. Tyla'] },
  { id: 'urn:entity:tv_show', label: 'Series', ask: 'A series', Icon: Tv, example: ['e.g. Abbott Elementary', 'e.g. Blood & Water'] }
];
const MINUTES = [45, 90, 120, 180];
const COUNTRIES: { code: string; label: string }[] = [
  { code: 'za', label: 'South Africa' },
  { code: 'ng', label: 'Nigeria' },
  { code: 'ke', label: 'Kenya' },
  { code: 'gb', label: 'United Kingdom' },
  { code: 'us', label: 'United States' },
  { code: 'ca', label: 'Canada' },
  { code: 'au', label: 'Australia' },
  { code: 'in', label: 'India' }
];
const MAX_FAVS = 3;

type Check =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'found'; name: string; image?: string; type: FavouriteType; alts: { name: string; type: FavouriteType }[] }
  | { state: 'suggest'; options: { name: string; type: FavouriteType }[] }
  | { state: 'elsewhere'; name: string; image?: string; type: FavouriteType }
  | { state: 'missing' }
  | { state: 'offline' };

interface FavDraft {
  query: string;
  type: FavouriteType;
  check: Check;
}
interface Draft {
  name: string;
  favs: FavDraft[];
}

const blankFav = (type: FavouriteType = 'urn:entity:artist'): FavDraft => ({ query: '', type, check: { state: 'idle' } });
const emptyDraft = (): Draft => ({ name: '', favs: TYPES.map((t) => blankFav(t.id)) });

/** Put saved favourites back into their slots (one per kind). */
const slotted = (favs: { query: string; type: FavouriteType }[]): FavDraft[] =>
  TYPES.map((t) => {
    const f = favs.find((x) => x.type === t.id);
    return { query: f?.query || '', type: t.id, check: { state: 'idle' } as Check };
  });

const fromPerson = (p?: Person): Draft => {
  if (!p) return emptyDraft();
  return { name: ['You', 'Them'].includes(p.name) ? '' : p.name, favs: slotted(p.favourites) };
};

const typeLabel = (t: FavouriteType) => (t === 'urn:entity:artist' ? 'music' : t === 'urn:entity:movie' ? 'film' : 'series');

/**
 * Ask Qloo (through our API) what this favourite is. It searches music, films and TV at once, so
 * people don't have to pick the right kind first: "The Office" finds the TV show, not a band.
 * Matching uses the planner's own rule. The most popular exact match wins; others are offered.
 */
async function checkFavourite(query: string, preferred: FavouriteType, strict = false): Promise<Check> {
  try {
    const answers = await Promise.all(
      TYPES.map(async (t) => {
        const res = await fetch(`/api/qloo/search?${new URLSearchParams({ query, type: t.id })}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.source === 'unavailable') return null;
        const results: { name: string; image?: string; popularity?: number }[] = Array.isArray(data.results) ? data.results : [];
        return results.map((r) => ({ ...r, type: t.id }));
      })
    );
    if (answers.every((a) => a === null)) return { state: 'offline' };
    const all = answers.flatMap((a) => a || []);
    const exact = all.filter((r) => nameFits(r.name, query));
    if (exact.length) {
      // One best match per kind, then the most popular kind first (ties go to the kind they chose).
      // Exactly what they typed beats a longer name ("Tyla" over "Tyla Yaweh"); then popularity,
      // then the kind they chose.
      const q = fold(query);
      const score = (e: (typeof exact)[number]) => (fold(e.name) === q ? 10 : 0) + (e.popularity ?? 0) + (e.type === preferred ? (strict ? 5 : 0.001) : 0);
      const ranked = [...exact].sort((x, y) => score(y) - score(x));
      const seen = new Set<string>();
      const distinct = ranked.filter((e) => !seen.has(`${fold(e.name)}|${e.type}`) && !!seen.add(`${fold(e.name)}|${e.type}`));
      const [best, ...rest] = distinct;
      // Collaborations and spin-offs ("The Chainsmokers, Coldplay") go last, so they're harder to tap by mistake.
      const derived = (n: string) => /[,&+]|\bfeat\b|\bx\b/i.test(n) || fold(n) !== q;
      const alts = [...rest].sort((x, y) => Number(derived(x.name)) - Number(derived(y.name))).slice(0, 3);
      // In a slot, a match of another kind means they put it in the wrong row ("Blood & Water" is a series).
      if (strict && best.type !== preferred) return { state: 'elsewhere', name: best.name, image: best.image, type: best.type };
      return {
        state: 'found',
        name: best.name,
        image: best.image,
        type: best.type,
        alts: alts.filter((e) => !strict || e.type === preferred).map((e) => ({ name: e.name, type: e.type }))
      };
    }
    const seen = new Set<string>();
    const options = all
      .sort((x, y) => (y.popularity ?? 0) - (x.popularity ?? 0))
      .filter((r) => !seen.has(`${r.name}|${r.type}`) && !!seen.add(`${r.name}|${r.type}`))
      .slice(0, 4)
      .map((r) => ({ name: r.name, type: r.type }));
    if (options.length) return { state: 'suggest', options };
    return { state: 'missing' };
  } catch {
    return { state: 'offline' };
  }
}

function CheckLine({ check, onUse }: { check: Check; onUse: (name: string, type: FavouriteType) => void }) {
  if (check.state === 'idle') return null;
  if (check.state === 'checking')
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted" role="status">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Checking Qloo…
      </p>
    );
  if (check.state === 'found')
    return (
      <div className="mt-1.5 text-[13px]" role="status">
        <p className="flex items-center gap-2 text-ink">
          <Art src={check.image} type={check.type} className="h-6 w-6 rounded-full" />
          <Check className="h-3.5 w-3.5 text-shared" aria-hidden /> Qloo knows {check.name} <span className="text-muted">({typeLabel(check.type)})</span>
        </p>
        {check.alts.length > 0 && (
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-muted">
            Not that one?
            {check.alts.map((a) => (
 <button key={`${a.name}|${a.type}`} type="button" className="min-h-[32px] rounded-full border border-line px-2.5 font-medium text-ink" onClick={() => onUse(a.name, a.type)}>
                {a.name} ({typeLabel(a.type)})
              </button>
            ))}
          </p>
        )}
      </div>
    );
  if (check.state === 'suggest')
    return (
      <div className="mt-1.5 text-[13px] text-ink" role="status">
        <p>Qloo doesn’t have that exact name (its data has gaps, especially for newer local names). Is it one of these? If not, try another favourite.</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {check.options.map((o) => (
            <button
              key={`${o.name}|${o.type}`}
              type="button"
              className="min-h-[36px] rounded-full border border-shared/40 bg-shared-soft px-3 font-medium text-shared-ink"
              onClick={() => onUse(o.name, o.type)}
            >
              {o.name} <span className="font-normal">({typeLabel(o.type)})</span>
            </button>
          ))}
        </div>
      </div>
    );
  if (check.state === 'elsewhere')
    return (
      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-ink" role="status">
        <span>
          Qloo knows {check.name} as a <strong>{typeLabel(check.type)}</strong>.
        </span>
        <button type="button" className="min-h-[32px] rounded-full bg-shared px-3 font-medium text-white" onClick={() => onUse(check.name, check.type)}>
          Move it to {typeLabel(check.type) === 'music' ? 'Music' : typeLabel(check.type) === 'film' ? 'Film' : 'Series'}
        </button>
      </div>
    );
  if (check.state === 'missing')
    return (
      <p className="mt-1.5 text-[13px] text-danger" role="status">
        Qloo doesn’t have this one yet. Check the spelling, or pick another you love: Qloo’s data has gaps, especially for newer local names.
      </p>
    );
  return <p className="mt-1.5 text-[13px] text-muted">Couldn’t check right now. We’ll try again when you plan.</p>;
}

function PersonCard({
  who,
  draft,
  onChange,
  autoFocus,
  top,
  hideFavs,
  self
}: {
  who: 'a' | 'b';
  draft: Draft;
  onChange: (d: Draft) => void;
  autoFocus?: boolean;
  top?: React.ReactNode; // shown under the name: for the second person, the "send a link" choice
  hideFavs?: boolean;
  self?: boolean; // this card belongs to whoever is holding the phone (the invited person)
}) {
  const latest = useRef(draft);
  latest.current = draft;
  const setFav = (i: number, patch: Partial<FavDraft>) => onChange({ ...latest.current, favs: latest.current.favs.map((f, j) => (j === i ? { ...f, ...patch } : f)) });

  // Check as they type, a moment after they stop, so they know straight away if Qloo knows it.
  const timers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const soon = (i: number) => {
    clearTimeout(timers.current[i]);
    timers.current[i] = setTimeout(() => runCheck(i), 500);
  };
  const lastChecked = useRef<Record<number, string>>({});
  const runCheck = async (i: number, force = false) => {
    const f = latest.current.favs[i];
    const q = f.query.trim();
    if (!force && lastChecked.current[i] === `${q}|${f.type}` && f.check.state !== 'idle' && f.check.state !== 'checking') return;
    lastChecked.current[i] = `${q}|${f.type}`;
    if (q.length < 2) return setFav(i, { check: { state: 'idle' } });
    setFav(i, { check: { state: 'checking' } });
    const result = await checkFavourite(q, f.type, true);
    // Ignore the answer if the person has typed something else since.
    if (latest.current.favs[i]?.query.trim() !== q) return;
    setFav(i, { check: result });
  };
  /** Use a match: in this slot if it's this kind, otherwise moved to the slot for its kind. */
  const useMatch = (i: number, name: string, type: FavouriteType) => {
    const favs = latest.current.favs;
    const j = favs.findIndex((x) => x.type === type);
    const found: Check = { state: 'found', name, type, alts: [] };
    if (j === i || j < 0) return setFav(i, { query: name, check: found });
    onChange({ ...latest.current, favs: favs.map((x, k) => (k === j ? { ...x, query: name, check: found } : k === i ? { ...x, query: '', check: { state: 'idle' } } : x)) });
  };

  const tone = who === 'a' ? 'border-t-a' : 'border-t-b';
  const dot = who === 'a' ? 'bg-a' : 'bg-b';
  const mine = who === 'a' || self;
  const label = mine ? 'You' : 'The other person';

  return (
    <div className={`rounded-3xl border border-t-4 border-line bg-card p-5 ${tone}`} role="group" aria-label={label}>
      <label className="block">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden /> {label}
        </span>
        <input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder={mine ? 'Your first name' : 'Their first name'}
          className="field mt-2 font-display text-lg"
          maxLength={24}
          autoComplete="off"
          autoFocus={autoFocus}
        />
      </label>

      {top}

      {!hideFavs && (
        <>
          <p className="mt-5 text-sm font-medium">{mine ? 'What do you love?' : `What does ${draft.name.trim() || 'they'} love?`}</p>
          <p className="text-[13px] text-muted">Fill in any you like. One is enough; all three is best.</p>
          <div className="mt-3 space-y-3">
            {draft.favs.map((f, i) => {
              const t = TYPES.find((x) => x.id === f.type)!;
              return (
                <div key={t.id}>
                  <label className="flex items-center gap-2">
                    <span className="flex w-[4.5rem] shrink-0 items-center gap-1.5 text-[13px] font-medium text-ink">
                      <t.Icon className="h-4 w-4 text-muted" aria-hidden /> {t.label}
                    </span>
                    <span className="sr-only">{t.ask}</span>
                    <input
                      value={f.query}
                      onChange={(e) => {
                        // Show "Checking Qloo…" straight away, so the field never looks dead.
                        setFav(i, { query: e.target.value, check: e.target.value.trim().length >= 2 ? { state: 'checking' } : { state: 'idle' } });
                        soon(i);
                      }}
                      onBlur={() => {
                        clearTimeout(timers.current[i]);
                        runCheck(i);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      placeholder={t.example[mine ? 0 : 1]}
                      aria-label={`${mine ? 'Your' : 'Their'} favourite ${t.label.toLowerCase()}`}
                      className="field min-w-0 flex-1"
                      maxLength={60}
                      autoComplete="off"
                      enterKeyHint="next"
                    />
                  </label>
                  <div className="pl-[5rem]">
                    <CheckLine check={f.check} onUse={(name, type) => useMatch(i, name, type)} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** The second person adds their own favourites on their phone. A's half travels in the link. */
function InvitePanel({ a, bName, minutes, avoid, onSent }: { a: Draft; bName: string; minutes: number; avoid: string; onSent?: (pairId: string, them: string) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ready = a.favs.some((f) => f.query.trim());
  const them = bName.trim() || 'them';
  const fromName = a.name.trim() || 'Your friend';

  // A pair space joins the two phones, so the plan opens on both. Made once, when it's first needed.
  const [pair, setPair] = useState<string | undefined>(undefined);
  const asked = useRef(false);
  useEffect(() => {
    if (!ready || asked.current) return;
    asked.current = true;
    fetch('/api/pair', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ names: [a.name.trim(), bName.trim()] }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j?.id && setPair(j.id))
      .catch(() => {});
  }, [ready, a.name, bName]);
  const sent = () => pair && onSent?.(pair, bName.trim());

  // Build the link as soon as A has a favourite, and keep it up to date as they edit.
  useEffect(() => {
    if (!ready) return setUrl(null);
    const inv: Invite = {
      v: 1,
      from: { name: fromName, favs: a.favs.filter((f) => f.query.trim()).map((f) => ({ query: f.query.trim(), type: f.type })) },
      toName: bName.trim(),
      minutes,
      avoid: avoid.split(',').map((x) => x.trim()).filter(Boolean),
      pair
    };
    setUrl(inviteUrl(window.location.origin, inv));
  }, [a, bName, minutes, avoid, ready, fromName, pair]);

  const message = `${fromName} wants to find something you'll both enjoy tonight. Add a few things you love here (takes a minute):`;
  const share = async () => {
    if (!url) return;
    try {
      sent();
      if (navigator.share) await navigator.share({ text: message, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* closed */
    }
  };
  const copy = async () => {
    if (!url) return;
    sent();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (!ready)
    return (
      <p className="mt-4 rounded-2xl bg-paper p-3 text-sm text-muted">
        Add at least one thing <span className="font-medium text-ink">you</span> love first (above). Then a link for {them} appears here.
      </p>
    );
  return (
    <div className="mt-4 rounded-2xl bg-b-soft p-4">
      <p className="text-[15px] font-medium text-ink">Send {them} this link</p>
      <p className="mt-1 text-sm text-muted">They add their own favourites on their phone. When the plan’s ready it opens on both phones, with a chat beside it.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-black"
          href={`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`}
          target="_blank"
          rel="noreferrer"
          onClick={sent}
        >
          <Share2 className="h-4 w-4" aria-hidden /> WhatsApp
        </a>
        <button type="button" onClick={share} className="btn-quiet">
          <Link2 className="h-4 w-4" aria-hidden /> Share
        </button>
        <button type="button" onClick={copy} className="btn-quiet" aria-label="Copy link">
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}

/**
 * The first five seconds: what it is, a picture of it, and two ways in. Apple-style: one idea per
 * line, a visual instead of a paragraph, and the details only after.
 */
function Intro({ busy, onExample }: { busy: boolean; onExample: (i: number) => void }) {
  const steps = [
    { n: '1', t: 'Add what you love', d: 'A film, an artist and a series each. Or send the other person a link.' },
    { n: '2', t: 'Qloo finds the overlap', d: 'Its taste data knows what fans of both of you go on to love.' },
    { n: '3', t: 'Get one night, fair to both', d: 'Something to watch, music, a swap each way. Every pick shows how it suits each of you.' }
  ];
  const extras = ['Mzansi match', 'Comedy', 'Swipe together', 'Watch in step', 'Chat', 'Date spots', 'Story cards'];
  return (
    <section className="pt-4 sm:pt-10" aria-labelledby="intro-title">
      <p className="text-sm font-semibold text-shared-ink">For two people with different taste</p>
      <h1 id="intro-title" className="mt-2 max-w-2xl text-[2.4rem] font-semibold leading-[1.02] sm:text-6xl">
        Two tastes. One night you’ll both enjoy.
      </h1>
      <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-muted sm:text-lg">
        Tell it what you each love. It plans a night in that suits you both, and shows you why.
      </p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <a href="#start" className="btn-primary justify-center">
          Plan our night
        </a>
        <button type="button" disabled={busy} onClick={() => onExample(0)} className="btn-quiet justify-center">
          See an example first
        </button>
      </div>

      {/* The idea as a picture: two tastes, and the part they share. */}
      <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-card p-5 sm:p-8" aria-hidden>
        <div className="relative mx-auto flex items-center justify-center py-2">
          <div className="flex h-40 w-40 shrink-0 items-center justify-start rounded-full bg-a/15 pl-5 ring-2 ring-a/40 sm:h-48 sm:w-48 sm:pl-7">
            <span className="max-w-[5.5rem] text-[13px] font-semibold leading-snug text-a-ink">
              Gogo
              <span className="block font-normal text-ink/70">Miriam Makeba</span>
            </span>
          </div>
          <div className="-ml-14 flex h-40 w-40 shrink-0 items-center justify-end rounded-full bg-b/15 pr-5 text-right ring-2 ring-b/40 sm:-ml-16 sm:h-48 sm:w-48 sm:pr-7">
            <span className="max-w-[5.5rem] text-[13px] font-semibold leading-snug text-b-ink">
              Lwazi
              <span className="block font-normal text-ink/70">Tyla</span>
            </span>
          </div>
          <div className="absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2 whitespace-nowrap rounded-2xl bg-shared px-4 py-2 text-center text-white shadow-lg">
            <span className="block text-[11px] uppercase tracking-wider text-white/80">Tonight</span>
            <span className="block font-display text-[15px] font-semibold">One night for both</span>
          </div>
        </div>
        <div className="h-6" />
      </div>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3" aria-label="How it works">
        {steps.map((s) => (
          <li key={s.n} className="rounded-2xl bg-card p-4">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[13px] font-semibold text-white">{s.n}</span>
            <p className="mt-2 font-semibold">{s.t}</p>
            <p className="mt-0.5 text-sm text-muted">{s.d}</p>
          </li>
        ))}
      </ol>

      <p className="mt-4 text-[13px] text-muted">
        <span className="font-medium text-ink">Also:</span> {extras.join(' · ')}. No sign-up.
      </p>
    </section>
  );
}

export function Setup({
  onStart,
  busy,
  initial,
  invite,
  onInviteSent
}: {
  onStart: (s: Session) => void;
  busy: boolean;
  initial?: Session | null;
  invite?: Invite | null;
  onInviteSent?: (pairId: string, them: string) => void;
}) {
  const keep = initial && !initial.isSample ? initial : null;
  const [a, setA] = useState<Draft>(() =>
    invite ? { name: invite.from.name, favs: slotted(invite.from.favs) } : fromPerson(keep?.people[0])
  );
  const [b, setB] = useState<Draft>(() => (invite ? { name: invite.toName, favs: emptyDraft().favs } : fromPerson(keep?.people[1])));
  const [minutes, setMinutes] = useState(invite?.minutes || keep?.minutes || 120);
  const [avoid, setAvoid] = useState(invite?.avoid.join(', ') || keep?.exclusions.join(', ') || '');
  const [country, setCountry] = useState(keep?.country || 'za');
  const [includeLocal, setIncludeLocal] = useState(keep?.includeLocal ?? true);
  const [bMode, setBMode] = useState<'here' | 'link'>('here');

  // If the page receives an invite after first render (hash change), adopt it.
  useEffect(() => {
    if (!invite) return;
    setA({ name: invite.from.name, favs: slotted(invite.from.favs) });
    setB((cur) => ({ ...cur, name: cur.name || invite.toName }));
    setMinutes(invite.minutes);
    setAvoid(invite.avoid.join(', '));
  }, [invite]);

  const toPerson = (id: 'a' | 'b', d: Draft): Person =>
    person(id, d.name.trim() || (id === 'a' ? 'You' : 'Them'), d.favs.filter((f) => f.query.trim()).map((f) => fav(f.query.trim(), f.type)));
  const hasFav = (d: Draft) => d.favs.some((f) => f.query.trim());
  const ready = hasFav(a) && hasFav(b);
  const missing = !hasFav(a) && !hasFav(b) ? 'Add at least one favourite for each of you.' : !hasFav(a) ? `Add a favourite for ${a.name.trim() || 'the first person'}.` : !hasFav(b) ? `Add a favourite for ${b.name.trim() || 'the second person'}.` : '';

  return (
    <div className="space-y-7">
      {invite ? (
        <section className="pt-4 sm:pt-8">
          <h1 className="max-w-xl text-[2.1rem] font-semibold leading-[1.05] sm:text-6xl">{`${invite.from.name} wants to plan a night with you.`}</h1>
          <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-muted">Add a film, an artist and a series you love. We’ll find what you’ll both enjoy, and it opens on both your phones.</p>
        </section>
      ) : (
        <Intro busy={busy} onExample={(i) => onStart(SAMPLE_PAIRS[i].make())} />
      )}

      {!invite && (
        <h2 id="start" className="scroll-mt-4 pt-2 font-display text-2xl font-semibold sm:text-3xl">
          Plan your night
        </h2>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {invite ? (
          <div className="rounded-3xl border border-t-4 border-line border-t-a bg-card p-5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-a" aria-hidden /> {invite.from.name} added
            </p>
            <ul className="mt-3 space-y-2">
              {[...invite.from.favs].sort((x, y) => TYPES.findIndex((t) => t.id === x.type) - TYPES.findIndex((t) => t.id === y.type)).map((f, i) => (
                <li key={i} className="flex items-baseline justify-between gap-3 border-b border-line pb-2 last:border-0">
                  <span className="font-medium">{f.query}</span>
                  <span className="text-[13px] text-muted">{TYPES.find((t) => t.id === f.type)?.label}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <PersonCard who="a" draft={a} onChange={setA} />
        )}
        <PersonCard
          who="b"
          draft={b}
          onChange={setB}
          autoFocus={!!invite}
          self={!!invite}
          hideFavs={!invite && bMode === 'link'}
          top={
            invite ? undefined : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-paper p-1 text-sm font-medium" role="radiogroup" aria-label={`How ${b.name.trim() || 'they'} will add favourites`}>
                  {(
                    [
                      ['here', 'They’re with me'],
                      ['link', 'Send them a link']
                    ] as const
                  ).map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={bMode === k}
                      onClick={() => setBMode(k)}
                      className={`min-h-[40px] rounded-full px-2 ${bMode === k ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {bMode === 'link' && <InvitePanel a={a} bName={b.name} minutes={minutes} avoid={avoid} onSent={onInviteSent} />}
              </>
            )
          }
        />
      </div>

      <section className="grid gap-5 rounded-3xl border border-line bg-card p-5 sm:grid-cols-2" aria-label="Your evening">
        <div>
          <p className="text-sm font-medium" id="time-label">
            Time together
          </p>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-labelledby="time-label">
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={minutes === m}
                onClick={() => setMinutes(m)}
                className={`min-h-[44px] rounded-full border px-4 text-sm font-medium transition ${minutes === m ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink/30'}`}
              >
                {minutesLabel(m)}
              </button>
            ))}
          </div>
        </div>
        <details className="group sm:col-span-2">
          <summary className="flex min-h-[44px] cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-shared-ink">
            More options
            <ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden />
            <span className="ml-1 truncate text-[13px] font-normal text-muted">Avoid list, country, Mzansi</span>
          </summary>
          <div className="mt-3 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Anything to avoid? (optional)</span>
          <input value={avoid} onChange={(e) => setAvoid(e.target.value)} placeholder="e.g. horror, war" className="field mt-2" maxLength={80} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Streaming country</span>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="field mt-2">
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-[44px] items-center gap-3 sm:col-span-2">
          <input type="checkbox" checked={includeLocal} onChange={(e) => setIncludeLocal(e.target.checked)} className="h-5 w-5 accent-[#6F42C1]" />
          <span className="text-sm">
            <span className="font-medium">Look for a Mzansi match</span>
            <span className="text-muted"> (South African artists, when Qloo finds a local thread in your shared taste)</span>
          </span>
        </label>
          </div>
        </details>
      </section>

      {!invite && bMode === 'link' ? (
        <p className="rounded-2xl bg-card p-4 text-sm text-muted">
          Once {b.name.trim() || 'they'} add{b.name.trim() ? 's' : ''} their favourites from your link, your plan opens here and on their phone at the same time.
        </p>
      ) : (
      <div className="flex flex-col items-start gap-3">
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() =>
            onStart(
              newSession(toPerson('a', a), toPerson('b', b), minutes, avoid.split(',').map((s) => s.trim()).filter(Boolean), false, { country, includeLocal })
            )
          }
          className="btn-primary w-full sm:w-auto"
        >
          Plan our night
        </button>
        <p className="text-sm text-muted" aria-live="polite">
          {missing || 'Your names stay in this app. Your favourites go to Qloo and, for planning, to Google’s Gemini.'}
        </p>
      </div>
      )}

      <div className="flex items-center gap-2 pt-2 text-xs text-muted">
        <Mark size={14} /> Powered by Qloo’s taste graph
      </div>
    </div>
  );
}
