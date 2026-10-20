'use client';

import React, { useState } from 'react';
import { Check, Copy, Loader2 } from 'lucide-react';
import type { FavouriteType } from '../../lib/cg/types';
import { fav, newSession, person } from '../../lib/cg/samples';
import { encodeResult, type StudyItem, type StudyResult, type Vote } from '../../lib/cg/study';
import { Mark, minutesLabel } from '../../components/cg/ui';

const TYPES: { id: FavouriteType; label: string }[] = [
  { id: 'urn:entity:artist', label: 'Music' },
  { id: 'urn:entity:movie', label: 'Film' },
  { id: 'urn:entity:tv_show', label: 'TV' }
];
type Stage = 'intro' | 'setup' | 'loading' | 'rate-a' | 'pass' | 'rate-b' | 'done';
interface Side {
  name: string;
  favs: { query: string; type: FavouriteType }[];
}
const blank = (): Side => ({ name: '', favs: [{ query: '', type: 'urn:entity:artist' }, { query: '', type: 'urn:entity:movie' }] });

function SideForm({ side, onChange, label, tone }: { side: Side; onChange: (s: Side) => void; label: string; tone: string }) {
  return (
    <fieldset className={`rounded-3xl border border-t-4 border-line bg-card p-5 ${tone}`}>
      <legend className="sr-only">{label}</legend>
      <label className="block text-sm font-medium">
        {label}, first name (optional)
        <input className="field mt-2" value={side.name} maxLength={24} onChange={(e) => onChange({ ...side, name: e.target.value })} />
      </label>
      <p className="mt-4 text-sm font-medium">Two or three things you love</p>
      {side.favs.map((f, i) => (
        <div key={i} className="mt-2 flex gap-2">
          <select
            className="field w-28 shrink-0"
            value={f.type}
            aria-label={`Kind of favourite ${i + 1}`}
            onChange={(e) => onChange({ ...side, favs: side.favs.map((x, j) => (j === i ? { ...x, type: e.target.value as FavouriteType } : x)) })}
          >
            {TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            className="field"
            value={f.query}
            maxLength={60}
            aria-label={`Favourite ${i + 1}`}
            onChange={(e) => onChange({ ...side, favs: side.favs.map((x, j) => (j === i ? { ...x, query: e.target.value } : x)) })}
          />
        </div>
      ))}
      {side.favs.length < 3 && (
        <button type="button" className="mt-2 min-h-[44px] text-sm font-medium text-shared-ink" onClick={() => onChange({ ...side, favs: [...side.favs, { query: '', type: 'urn:entity:tv_show' }] })}>
          Add another
        </button>
      )}
    </fieldset>
  );
}

function RateList({ items, who, votes, setVote }: { items: StudyItem[]; who: string; votes: Record<string, Vote>; setVote: (id: string, v: Vote) => void }) {
  const opts: { v: Vote; label: string }[] = [
    { v: 'yes', label: 'Yes' },
    { v: 'maybe', label: 'Maybe' },
    { v: 'no', label: 'No' }
  ];
  return (
    <ol className="space-y-3">
      {items.map((it) => (
        <li key={it.id} className="rounded-2xl border border-line bg-card p-4">
          <p className="font-semibold">{it.title}</p>
          <p className="text-[13px] text-muted">
            {it.kind === 'listen' ? 'Music to put on' : it.type.includes('tv') ? 'A TV show to watch' : 'A film to watch'}
            {it.year ? `, ${it.year}` : ''}
          </p>
          <fieldset className="mt-2">
            <legend className="sr-only">
              Would {who} choose {it.title} tonight?
            </legend>
            <div className="flex gap-2">
              {opts.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  aria-pressed={votes[it.id] === o.v}
                  onClick={() => setVote(it.id, o.v)}
                  className={`min-h-[44px] flex-1 rounded-full border text-sm font-medium ${votes[it.id] === o.v ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink/30'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
        </li>
      ))}
    </ol>
  );
}

export default function StudyPage() {
  const [stage, setStage] = useState<Stage>('intro');
  const [a, setA] = useState<Side>(blank);
  const [b, setB] = useState<Side>(blank);
  const [minutes, setMinutes] = useState(120);
  const [items, setItems] = useState<StudyItem[]>([]);
  const [planner, setPlanner] = useState<string | undefined>();
  const [va, setVa] = useState<Record<string, Vote>>({});
  const [vb, setVb] = useState<Record<string, Vote>>({});
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [copied, setCopied] = useState(false);

  const nameA = a.name.trim() || 'Person 1';
  const nameB = b.name.trim() || 'Person 2';
  const ready = a.favs.some((f) => f.query.trim()) && b.favs.some((f) => f.query.trim());

  const generate = async () => {
    setStage('loading');
    setError(null);
    // Names are not needed for the study: the server only sees "Person 1" and "Person 2".
    const session = newSession(
      person('a', 'Person 1', a.favs.filter((f) => f.query.trim()).map((f) => fav(f.query.trim(), f.type))),
      person('b', 'Person 2', b.favs.filter((f) => f.query.trim()).map((f) => fav(f.query.trim(), f.type))),
      minutes
    );
    try {
      const res = await fetch('/api/study', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.items)) throw new Error(data.error || 'Something went wrong. Please try again.');
      setItems(data.items);
      setPlanner(data.planner);
      setStage('rate-a');
      window.scrollTo({ top: 0 });
    } catch (e: any) {
      setError(String(e?.message || e));
      setStage('setup');
    }
  };

  const finish = () => {
    const result: StudyResult = {
      v: 1,
      pair: Math.random().toString(36).slice(2, 10),
      at: new Date().toISOString(),
      planner,
      items: items.map((i) => ({ s: i.sources, k: i.kind, a: va[i.id], b: vb[i.id] }))
    };
    setCode(encodeResult(result));
    setStage('done');
    window.scrollTo({ top: 0 });
  };

  const allRated = (v: Record<string, Vote>) => items.every((i) => v[i.id]);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-4 sm:px-6">
        <Mark size={20} />
        <a href="/" className="font-display text-lg font-semibold">
          Common Ground
        </a>
        <span className="text-sm text-muted">study</span>
      </header>
      <div className="mx-auto max-w-2xl space-y-6 px-4 pb-16 sm:px-6">
        {stage === 'intro' && (
          <section className="space-y-4 pt-4">
            <h1 className="text-4xl font-semibold leading-tight">Help test Common Ground</h1>
            <p className="text-[17px] leading-relaxed text-muted">
              This takes about five minutes for two people together. You each add a few favourites, then rate a mixed list of things to watch and listen to. Some come from Common Ground, some from an AI
              on its own. You won’t know which is which.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              <li>Each of you rates on your own, without seeing the other’s answers.</li>
              <li>We don’t store anything. At the end you get a short code with only your ratings (no names or favourites) to send back if you choose.</li>
              <li>Your favourites go to Qloo and Google’s Gemini to make the lists.</li>
            </ul>
            <button type="button" className="btn-primary" onClick={() => setStage('setup')}>
              Start
            </button>
          </section>
        )}

        {stage === 'setup' && (
          <section className="space-y-4 pt-2">
            <h1 className="text-3xl font-semibold">Your favourites</h1>
            {error && (
              <p role="alert" className="rounded-2xl border border-danger/30 bg-card px-4 py-3 text-sm">
                {error}
              </p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <SideForm side={a} onChange={setA} label="Person 1" tone="border-t-a" />
              <SideForm side={b} onChange={setB} label="Person 2" tone="border-t-b" />
            </div>
            <div className="rounded-3xl border border-line bg-card p-5">
              <p className="text-sm font-medium">Time together</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[90, 120, 180].map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={minutes === m}
                    onClick={() => setMinutes(m)}
                    className={`min-h-[44px] rounded-full border px-4 text-sm font-medium ${minutes === m ? 'border-ink bg-ink text-white' : 'border-line'}`}
                  >
                    {minutesLabel(m)}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="btn-primary" disabled={!ready} onClick={generate}>
              Make the lists
            </button>
          </section>
        )}

        {stage === 'loading' && (
          <div className="flex flex-col items-center py-20 text-center" role="status">
            <Loader2 className="h-8 w-8 animate-spin text-shared" aria-hidden />
            <p className="mt-4 font-display text-xl">Making both lists…</p>
            <p className="mt-1 text-sm text-muted">Usually 15 to 30 seconds.</p>
          </div>
        )}

        {(stage === 'rate-a' || stage === 'rate-b') && (
          <section className="space-y-4 pt-2">
            <h1 className="text-3xl font-semibold">{stage === 'rate-a' ? nameA : nameB}, would you choose these tonight?</h1>
            <p className="text-sm text-muted">Rate each one on your own. There are no right answers.</p>
            <RateList
              items={items}
              who={stage === 'rate-a' ? nameA : nameB}
              votes={stage === 'rate-a' ? va : vb}
              setVote={(id, v) => (stage === 'rate-a' ? setVa((c) => ({ ...c, [id]: v })) : setVb((c) => ({ ...c, [id]: v })))}
            />
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              disabled={!allRated(stage === 'rate-a' ? va : vb)}
              onClick={() => {
                if (stage === 'rate-a') {
                  setStage('pass');
                  window.scrollTo({ top: 0 });
                } else finish();
              }}
            >
              {stage === 'rate-a' ? 'Done' : 'Finish'}
            </button>
          </section>
        )}

        {stage === 'pass' && (
          <section className="space-y-4 py-16 text-center">
            <h1 className="text-3xl font-semibold">Pass the phone to {nameB}</h1>
            <p className="text-muted">{nameA}’s answers are hidden.</p>
            <button type="button" className="btn-primary" onClick={() => setStage('rate-b')}>
              I’m {nameB}, start
            </button>
          </section>
        )}

        {stage === 'done' && (
          <section className="space-y-4 pt-4">
            <h1 className="text-3xl font-semibold">Thank you</h1>
            <p className="text-muted">Here’s your result code. It contains only your ratings and which method made each pick: no names, no favourites.</p>
            <textarea readOnly value={code} className="field h-28 font-mono text-xs" aria-label="Result code" onFocus={(e) => e.currentTarget.select()} />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-quiet"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(code);
                    setCopied(true);
                  } catch {
                    /* ignore */
                  }
                }}
              >
                {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />} {copied ? 'Copied' : 'Copy code'}
              </button>
              <a className="btn-quiet" href={`https://wa.me/?text=${encodeURIComponent(`Common Ground study result: ${code}`)}`} target="_blank" rel="noreferrer">
                Send on WhatsApp
              </a>
            </div>
            <p className="text-sm text-muted">
              Curious which was which? {items.filter((i) => i.sources.includes('qloo')).length} of the {items.length} came from Common Ground.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
