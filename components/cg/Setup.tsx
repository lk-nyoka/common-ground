'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Link2, Loader2, Plus, X } from 'lucide-react';
import type { FavouriteType, Person, Session } from '../../lib/cg/types';
import { fav, newSession, person, SAMPLE_PAIRS } from '../../lib/cg/samples';
import { namesMatch } from '../../lib/cg/match';
import { type Invite, inviteUrl } from '../../lib/cg/invite';
import { Art, Mark, minutesLabel } from './ui';

const TYPES: { id: FavouriteType; label: string; example: [string, string] }[] = [
  { id: 'urn:entity:artist', label: 'Music', example: ['An artist, e.g. Miriam Makeba', 'An artist, e.g. Tyla'] },
  { id: 'urn:entity:movie', label: 'Film', example: ['A film, e.g. Black Panther', 'A film, e.g. The Notebook'] },
  { id: 'urn:entity:tv_show', label: 'TV', example: ['A show, e.g. Abbott Elementary', "A show, e.g. Grey's Anatomy"] }
];
const MINUTES = [45, 90, 120, 180];
const MAX_FAVS = 3;

type Check =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'found'; name: string; image?: string }
  | { state: 'suggest'; names: string[] }
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

/** Ask Qloo (through our API) whether it knows this favourite, using the planner's own matching rule. */
async function checkFavourite(query: string, type: FavouriteType): Promise<Check> {
  try {
    const res = await fetch(`/api/qloo/search?${new URLSearchParams({ query, type })}`);
    if (!res.ok) return { state: 'offline' };
    const data = await res.json();
    if (data.source === 'unavailable') return { state: 'offline' };
    const results: { name: string; image?: string }[] = Array.isArray(data.results) ? data.results : [];
    const hit = results.find((r) => namesMatch(r.name, query));
    if (hit) return { state: 'found', name: hit.name, image: hit.image };
    const names = Array.from(new Set(results.map((r) => r.name))).slice(0, 3);
    if (names.length) return { state: 'suggest', names };
    return { state: 'missing' };
  } catch {
    return { state: 'offline' };
  }
}

function CheckLine({ check, onUse }: { check: Check; onUse: (name: string) => void }) {
  if (check.state === 'idle') return null;
  if (check.state === 'checking')
    return (
      <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Checking Qloo…
      </p>
    );
  if (check.state === 'found')
    return (
      <p className="mt-1.5 flex items-center gap-2 text-[13px] text-ink">
        <Art src={check.image} type="urn:entity:artist" className="h-6 w-6 rounded-full" />
        <Check className="h-3.5 w-3.5 text-shared" aria-hidden /> Qloo knows {check.name}
      </p>
    );
  if (check.state === 'suggest')
    return (
      <div className="mt-1.5 text-[13px] text-ink">
        <p>Qloo doesn’t know that exactly. Did you mean:</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {check.names.map((n) => (
            <button key={n} type="button" className="min-h-[36px] rounded-full border border-shared/40 bg-shared-soft px-3 font-medium text-shared-ink" onClick={() => onUse(n)}>
              {n}
            </button>
          ))}
        </div>
      </div>
    );
  if (check.state === 'missing') return <p className="mt-1.5 text-[13px] text-danger">Qloo doesn’t know this one. Check the spelling or try the full name.</p>;
  return <p className="mt-1.5 text-[13px] text-muted">Couldn’t check right now. We’ll try again when you plan.</p>;
}

function PersonCard({ who, draft, onChange, autoFocus }: { who: 'a' | 'b'; draft: Draft; onChange: (d: Draft) => void; autoFocus?: boolean }) {
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
    if (latest.current.favs[i]?.query.trim() === q && latest.current.favs[i]?.type === f.type) setFav(i, { check: result });
  };

  const tone = who === 'a' ? 'border-t-a' : 'border-t-b';
  const dot = who === 'a' ? 'bg-a' : 'bg-b';
  const label = who === 'a' ? 'First person' : 'Second person';

  return (
    <div className={`rounded-3xl border border-t-4 border-line bg-card p-5 ${tone}`} role="group" aria-label={label}>
      <label className="block">
        <span className="flex items-center gap-2 text-sm font-medium">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} aria-hidden /> {label}
        </span>
        <input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder={who === 'a' ? 'Your name' : 'Their name'}
          className="field mt-2 font-display text-lg"
          maxLength={24}
          autoComplete="off"
          autoFocus={autoFocus}
        />
      </label>

      <p className="mt-5 text-sm font-medium">A few things they love</p>
      <div className="mt-2 space-y-4">
        {draft.favs.map((f, i) => (
          <div key={i}>
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 rounded-full border border-line bg-paper p-0.5" role="radiogroup" aria-label={`Kind of favourite ${i + 1}`}>
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    role="radio"
                    aria-checked={f.type === t.id}
                    onClick={() => {
                      setFav(i, { type: t.id, check: { state: 'idle' } });
                      if (f.query.trim()) setTimeout(() => runCheck(i), 0);
                    }}
                    className={`min-h-[36px] rounded-full px-2.5 text-[13px] font-medium transition ${f.type === t.id ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              {draft.favs.length > 1 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...draft, favs: draft.favs.filter((_, j) => j !== i) })}
                  className="ml-auto flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-paper hover:text-ink"
                  aria-label={`Remove favourite ${i + 1}`}
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
            <input
              value={f.query}
              onChange={(e) => setFav(i, { query: e.target.value, check: { state: 'idle' } })}
              onBlur={() => runCheck(i)}
              placeholder={TYPES.find((t) => t.id === f.type)!.example[who === 'a' ? 0 : 1]}
              aria-label={`Favourite ${i + 1}`}
              className="field mt-2"
              maxLength={60}
              autoComplete="off"
            />
            <CheckLine check={f.check} onUse={(name) => setFav(i, { query: name, check: { state: 'found', name } })} />
          </div>
        ))}
      </div>
      {draft.favs.length < MAX_FAVS && (
        <button
          type="button"
          onClick={() => onChange({ ...draft, favs: [...draft.favs, blankFav(draft.favs.length === 1 ? 'urn:entity:movie' : 'urn:entity:tv_show')] })}
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-shared-ink"
        >
          <Plus className="h-4 w-4" aria-hidden /> Add another
        </button>
      )}
    </div>
  );
}

function InvitePanel({ a, bName, minutes, avoid }: { a: Draft; bName: string; minutes: number; avoid: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const ready = a.favs.some((f) => f.query.trim());
  const make = async () => {
    const inv: Invite = {
      v: 1,
      from: { name: a.name.trim() || 'Your friend', favs: a.favs.filter((f) => f.query.trim()).map((f) => ({ query: f.query.trim(), type: f.type })) },
      toName: bName.trim(),
      minutes,
      avoid: avoid.split(',').map((s) => s.trim()).filter(Boolean)
    };
    const link = inviteUrl(window.location.origin, inv);
    setUrl(link);
    const text = `${inv.from.name} wants to find something you'll both enjoy tonight. Add your favourites here:`;
    try {
      if (navigator.share) await navigator.share({ text, url: link });
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
  return (
    <div className="rounded-3xl border border-dashed border-line bg-card/60 p-5">
      <p className="text-[15px] font-medium">Not together right now?</p>
      <p className="mt-1 text-sm text-muted">
        Send {bName.trim() || 'them'} a link and they add their own favourites on their phone. Your half travels inside the link; nothing is stored on our server.
      </p>
      <button type="button" onClick={make} disabled={!ready} className="btn-quiet mt-3">
        <Link2 className="h-4 w-4" aria-hidden /> Create a link for {bName.trim() || 'them'}
      </button>
      {!ready && <p className="mt-2 text-xs text-muted">Add at least one of your favourites first.</p>}
      {url && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <input readOnly value={url} className="field min-w-0 flex-1 text-xs" aria-label="Invite link" onFocus={(e) => e.currentTarget.select()} />
            <button type="button" onClick={copy} className="btn-quiet shrink-0" aria-label="Copy link">
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <a
            className="inline-flex min-h-[44px] items-center text-sm font-medium text-shared-ink underline underline-offset-2"
            href={`https://wa.me/?text=${encodeURIComponent(`Add your favourites so we can plan tonight: ${url}`)}`}
            target="_blank"
            rel="noreferrer"
          >
            Send on WhatsApp
          </a>
        </div>
      )}
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
        <PersonCard who="b" draft={b} onChange={setB} autoFocus={!!invite} />
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
        <label className="block">
          <span className="text-sm font-medium">Anything to avoid? (optional)</span>
          <input value={avoid} onChange={(e) => setAvoid(e.target.value)} placeholder="e.g. horror, war" className="field mt-2" maxLength={80} />
        </label>
      </section>

      {!invite && <InvitePanel a={a} bName={b.name} minutes={minutes} avoid={avoid} />}

      <div className="flex flex-col items-start gap-3">
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => onStart(newSession(toPerson('a', a), toPerson('b', b), minutes, avoid.split(',').map((s) => s.trim()).filter(Boolean)))}
          className="btn-primary w-full sm:w-auto"
        >
          Plan our night
        </button>
        <p className="text-sm text-muted" aria-live="polite">
          {missing || 'Your names stay in this app. Your favourites go to Qloo and, for planning, to Google’s Gemini.'}
        </p>
      </div>

      <div className="flex items-center gap-2 pt-2 text-xs text-muted">
        <Mark size={14} /> Powered by Qloo’s taste graph
      </div>
    </div>
  );
}
