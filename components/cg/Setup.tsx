'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Copy, Link2, Loader2, Plus, Share2, X } from 'lucide-react';
import type { FavouriteType, Person, Session } from '../../lib/cg/types';
import { fav, newSession, person, SAMPLE_PAIRS } from '../../lib/cg/samples';
import { fold, namesMatch } from '../../lib/cg/match';
import { type Invite, inviteUrl } from '../../lib/cg/invite';
import { Art, Mark, minutesLabel } from './ui';

const TYPES: { id: FavouriteType; label: string; example: [string, string] }[] = [
  { id: 'urn:entity:artist', label: 'Music', example: ['An artist, e.g. Miriam Makeba', 'An artist, e.g. Tyla'] },
  { id: 'urn:entity:movie', label: 'Film', example: ['A film, e.g. Black Panther', 'A film, e.g. The Notebook'] },
  { id: 'urn:entity:tv_show', label: 'TV', example: ['A show, e.g. Abbott Elementary', "A show, e.g. Grey's Anatomy"] }
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
const emptyDraft = (): Draft => ({ name: '', favs: [blankFav()] });

const fromPerson = (p?: Person): Draft => {
  if (!p) return emptyDraft();
  return {
    name: ['You', 'Them'].includes(p.name) ? '' : p.name,
    favs: p.favourites.length ? p.favourites.map((f) => ({ query: f.query, type: f.type, check: { state: 'idle' } as Check })) : [blankFav()]
  };
};

const typeLabel = (t: FavouriteType) => (t === 'urn:entity:artist' ? 'music' : t === 'urn:entity:movie' ? 'film' : 'TV show');

/**
 * Ask Qloo (through our API) what this favourite is. It searches music, films and TV at once, so
 * people don't have to pick the right kind first: "The Office" finds the TV show, not a band.
 * Matching uses the planner's own rule. The most popular exact match wins; others are offered.
 */
async function checkFavourite(query: string, preferred: FavouriteType): Promise<Check> {
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
    const exact = all.filter((r) => namesMatch(r.name, query));
    if (exact.length) {
      // One best match per kind, then the most popular kind first (ties go to the kind they chose).
      // Exactly what they typed beats a longer name ("Tyla" over "Tyla Yaweh"); then popularity,
      // then the kind they chose.
      const q = fold(query);
      const score = (e: (typeof exact)[number]) => (fold(e.name) === q ? 10 : 0) + (e.popularity ?? 0) + (e.type === preferred ? 0.001 : 0);
      const ranked = [...exact].sort((x, y) => score(y) - score(x));
      const seen = new Set<string>();
      const distinct = ranked.filter((e) => !seen.has(`${fold(e.name)}|${e.type}`) && !!seen.add(`${fold(e.name)}|${e.type}`));
      const [best, ...rest] = distinct;
      return { state: 'found', name: best.name, image: best.image, type: best.type, alts: rest.slice(0, 3).map((e) => ({ name: e.name, type: e.type })) };
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
      <div className="mt-1.5 text-[13px] text-ink">
        <p>Qloo doesn’t know that exactly. Did you mean:</p>
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
  if (check.state === 'missing') return <p className="mt-1.5 text-[13px] text-danger">Qloo doesn’t know this one. Check the spelling or try the full name.</p>;
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

  const runCheck = async (i: number) => {
    const f = latest.current.favs[i];
    const q = f.query.trim();
    if (q.length < 2) return setFav(i, { check: { state: 'idle' } });
    setFav(i, { check: { state: 'checking' } });
    const result = await checkFavourite(q, f.type);
    // Ignore the answer if the person has typed something else since.
    if (latest.current.favs[i]?.query.trim() !== q) return;
    setFav(i, result.state === 'found' ? { check: result, type: result.type } : { check: result });
  };

  const tone = who === 'a' ? 'border-t-a' : 'border-t-b';
  const dot = who === 'a' ? 'bg-a' : 'bg-b';
  const mine = who === 'a' || self;
  const label = mine ? 'You' : 'The other person';
  const examples = who === 'a' ? ['e.g. Miriam Makeba', 'e.g. Black Panther', 'e.g. Abbott Elementary'] : ['e.g. Tyla', 'e.g. The Notebook', "e.g. Grey's Anatomy"];

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
          <p className="mt-5 text-sm font-medium">{mine ? 'Things you love' : `Things ${draft.name.trim() || 'they'} love${draft.name.trim() ? 's' : ''}`}</p>
          <p className="text-[13px] text-muted">Any artist, film or TV show. One is enough; three is better.</p>
          <div className="mt-2 space-y-4">
            {draft.favs.map((f, i) => (
              <div key={i}>
                <div className="flex items-center gap-2">
                  <input
                    value={f.query}
                    onChange={(e) => setFav(i, { query: e.target.value, check: { state: 'idle' } })}
                    onBlur={() => runCheck(i)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    placeholder={examples[i % 3]}
                    aria-label={`Favourite ${i + 1}`}
                    className="field min-w-0 flex-1"
                    maxLength={60}
                    autoComplete="off"
                    enterKeyHint="done"
                  />
                  {draft.favs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => onChange({ ...draft, favs: draft.favs.filter((_, j) => j !== i) })}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-ink"
                      aria-label={`Remove favourite ${i + 1}`}
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  )}
                </div>
                <CheckLine check={f.check} onUse={(name, type) => setFav(i, { query: name, type, check: { state: 'found', name, type, alts: [] } })} />
              </div>
            ))}
          </div>
          {draft.favs.length < MAX_FAVS && (
            <button
              type="button"
              onClick={() => onChange({ ...draft, favs: [...draft.favs, blankFav()] })}
              className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-shared-ink"
            >
              <Plus className="h-4 w-4" aria-hidden /> Add another
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** The second person adds their own favourites on their phone. A's half travels in the link. */
function InvitePanel({ a, bName, minutes, avoid }: { a: Draft; bName: string; minutes: number; avoid: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ready = a.favs.some((f) => f.query.trim());
  const them = bName.trim() || 'them';
  const fromName = a.name.trim() || 'Your friend';

  // Build the link as soon as A has a favourite, and keep it up to date as they edit.
  useEffect(() => {
    if (!ready) return setUrl(null);
    const inv: Invite = {
      v: 1,
      from: { name: fromName, favs: a.favs.filter((f) => f.query.trim()).map((f) => ({ query: f.query.trim(), type: f.type })) },
      toName: bName.trim(),
      minutes,
      avoid: avoid.split(',').map((x) => x.trim()).filter(Boolean)
    };
    setUrl(inviteUrl(window.location.origin, inv));
  }, [a, bName, minutes, avoid, ready, fromName]);

  const message = `${fromName} wants to find something you'll both enjoy tonight. Add a few things you love here (takes a minute):`;
  const share = async () => {
    if (!url) return;
    try {
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
      <p className="mt-1 text-sm text-muted">They add their own favourites on their phone and get the plan straight away. Your favourites travel inside the link; nothing is stored on our server.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-semibold text-black"
          href={`https://wa.me/?text=${encodeURIComponent(`${message} ${url}`)}`}
          target="_blank"
          rel="noreferrer"
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

export function Setup({
  onStart,
  busy,
  initial,
  invite
}: {
  onStart: (s: Session) => void;
  busy: boolean;
  initial?: Session | null;
  invite?: Invite | null;
}) {
  const keep = initial && !initial.isSample ? initial : null;
  const [a, setA] = useState<Draft>(() =>
    invite ? { name: invite.from.name, favs: invite.from.favs.map((f) => ({ ...f, check: { state: 'idle' } as Check })) } : fromPerson(keep?.people[0])
  );
  const [b, setB] = useState<Draft>(() => (invite ? { name: invite.toName, favs: [blankFav()] } : fromPerson(keep?.people[1])));
  const [minutes, setMinutes] = useState(invite?.minutes || keep?.minutes || 120);
  const [avoid, setAvoid] = useState(invite?.avoid.join(', ') || keep?.exclusions.join(', ') || '');
  const [country, setCountry] = useState(keep?.country || 'za');
  const [includeLocal, setIncludeLocal] = useState(keep?.includeLocal ?? true);
  const [bMode, setBMode] = useState<'here' | 'link'>('here');

  // If the page receives an invite after first render (hash change), adopt it.
  useEffect(() => {
    if (!invite) return;
    setA({ name: invite.from.name, favs: invite.from.favs.map((f) => ({ ...f, check: { state: 'idle' } as Check })) });
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
      <section className="pt-4 sm:pt-8">
        <h1 className="max-w-xl text-[2.5rem] font-semibold leading-[1.05] sm:text-6xl">
          {invite ? `${invite.from.name} wants to plan a night with you.` : 'Two tastes. One night you’ll both enjoy.'}
        </h1>
        <p className="mt-4 max-w-lg text-[17px] leading-relaxed text-muted">
          {invite
            ? 'Add a few things you love. We’ll find where your tastes meet and plan something you’ll both enjoy.'
            : 'Add a few favourites each. Qloo’s taste data finds where you overlap, the agent plans a night in, and every pick shows why it suits you both.'}
        </p>
      </section>

      {!invite && (
        <section aria-labelledby="examples-title">
          <h2 id="examples-title" className="text-sm font-medium text-muted">
            Or start with an example
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {SAMPLE_PAIRS.map((p) => (
              <button key={p.label} type="button" disabled={busy} onClick={() => onStart(p.make())} className="btn-quiet text-left">
                <span className="font-semibold">{p.label}</span>
                <span className="text-muted">{p.hint}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {invite ? (
          <div className="rounded-3xl border border-t-4 border-line border-t-a bg-card p-5">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className="h-2.5 w-2.5 rounded-full bg-a" aria-hidden /> {invite.from.name} added
            </p>
            <ul className="mt-3 space-y-2">
              {invite.from.favs.map((f, i) => (
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
                {bMode === 'link' && <InvitePanel a={a} bName={b.name} minutes={minutes} avoid={avoid} />}
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
          Once {b.name.trim() || 'they'} add{b.name.trim() ? 's' : ''} their favourites from your link, the plan opens on their phone. They can send you the room link from there to swipe together.
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
