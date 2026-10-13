'use client';

import React, { useState } from 'react';
import { Film, Music2, Plus, Tv, X } from 'lucide-react';
import type { FavouriteType, Person, Session } from '../../lib/cg/types';
import { fav, newSession, person, SAMPLE_PAIRS } from '../../lib/cg/samples';

const TYPES: { id: FavouriteType; label: string; icon: React.ReactNode }[] = [
  { id: 'urn:entity:artist', label: 'Music', icon: <Music2 className="h-3.5 w-3.5" /> },
  { id: 'urn:entity:movie', label: 'Film', icon: <Film className="h-3.5 w-3.5" /> },
  { id: 'urn:entity:tv_show', label: 'TV', icon: <Tv className="h-3.5 w-3.5" /> }
];

const MINUTES = [45, 90, 120, 180];
const MAX_FAVS = 3;

interface Draft {
  name: string;
  favs: { query: string; type: FavouriteType }[];
}

const emptyDraft = (): Draft => ({ name: '', favs: [{ query: '', type: 'urn:entity:artist' }] });

function PersonCard({ who, draft, onChange, tone }: { who: 'a' | 'b'; draft: Draft; onChange: (d: Draft) => void; tone: string }) {
  const setFav = (i: number, patch: Partial<Draft['favs'][number]>) =>
    onChange({ ...draft, favs: draft.favs.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${tone}`}>
          {(draft.name.trim()[0] || (who === 'a' ? 'A' : 'B')).toUpperCase()}
        </span>
        <input
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder={who === 'a' ? 'Your name' : 'Their name'}
          aria-label={who === 'a' ? 'First person name' : 'Second person name'}
          className="w-full border-b border-transparent bg-transparent text-lg font-semibold outline-none placeholder:text-muted/70 focus:border-line"
          maxLength={24}
        />
      </div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Loves</p>
      <div className="space-y-2">
        {draft.favs.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex shrink-0 rounded-lg border border-line p-0.5">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setFav(i, { type: t.id })}
                  title={t.label}
                  aria-label={t.label}
                  aria-pressed={f.type === t.id}
                  className={`rounded-md p-1.5 ${f.type === t.id ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
                >
                  {t.icon}
                </button>
              ))}
            </div>
            <input
              value={f.query}
              onChange={(e) => setFav(i, { query: e.target.value })}
              placeholder={f.type === 'urn:entity:artist' ? 'An artist' : f.type === 'urn:entity:movie' ? 'A film' : 'A TV show'}
              className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink/40"
              maxLength={60}
            />
            {draft.favs.length > 1 && (
              <button type="button" onClick={() => onChange({ ...draft, favs: draft.favs.filter((_, j) => j !== i) })} className="p-1 text-muted hover:text-ink" aria-label="Remove">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {draft.favs.length < MAX_FAVS && (
        <button
          type="button"
          onClick={() => onChange({ ...draft, favs: [...draft.favs, { query: '', type: draft.favs.length === 1 ? 'urn:entity:movie' : 'urn:entity:tv_show' }] })}
          className="mt-3 inline-flex items-center gap-1 text-sm text-muted hover:text-ink"
        >
          <Plus className="h-4 w-4" /> Add another
        </button>
      )}
    </div>
  );
}

export function Setup({ onStart, busy }: { onStart: (s: Session) => void; busy: boolean }) {
  const [a, setA] = useState<Draft>(emptyDraft);
  const [b, setB] = useState<Draft>(emptyDraft);
  const [minutes, setMinutes] = useState(120);
  const [avoid, setAvoid] = useState('');

  const toPerson = (id: 'a' | 'b', d: Draft): Person =>
    person(id, d.name.trim() || (id === 'a' ? 'You' : 'Them'), d.favs.filter((f) => f.query.trim()).map((f) => fav(f.query.trim(), f.type)));

  const ready = a.favs.some((f) => f.query.trim()) && b.favs.some((f) => f.query.trim());

  return (
    <div className="space-y-8">
      <section className="pt-6 text-center sm:pt-10">
        <h1 className="font-display text-4xl leading-tight tracking-tight sm:text-5xl">Find what you’ll both love tonight.</h1>
        <p className="mx-auto mt-3 max-w-md text-muted">A few favourites each. Qloo finds where your tastes meet, and the agent plans a night in.</p>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="text-muted">Try a sample pair:</span>
        {SAMPLE_PAIRS.map((p) => (
          <button
            key={p.label}
            type="button"
            disabled={busy}
            onClick={() => onStart(p.make())}
            className="rounded-full border border-line bg-card px-3 py-1.5 hover:border-ink/40 disabled:opacity-50"
            title={p.hint}
          >
            {p.label} <span className="text-muted">· {p.hint}</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <PersonCard who="a" draft={a} onChange={setA} tone="bg-personA" />
        <PersonCard who="b" draft={b} onChange={setB} tone="bg-personB" />
      </div>

      <div className="grid gap-4 rounded-2xl border border-line bg-card p-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Time together</p>
          <div className="flex flex-wrap gap-2">
            {MINUTES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMinutes(m)}
                className={`rounded-full border px-3 py-1.5 text-sm ${minutes === m ? 'border-ink bg-ink text-white' : 'border-line hover:border-ink/40'}`}
              >
                {m < 60 ? `${m} min` : `${m / 60} h`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Avoid (optional)</p>
          <input
            value={avoid}
            onChange={(e) => setAvoid(e.target.value)}
            placeholder="e.g. horror, war"
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-ink/40"
            maxLength={80}
          />
        </div>
      </div>

      <div className="text-center">
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() =>
            onStart(newSession(toPerson('a', a), toPerson('b', b), minutes, avoid.split(',').map((s) => s.trim()).filter(Boolean)))
          }
          className="rounded-full bg-accent px-7 py-3 font-medium text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Find our common ground
        </button>
        <p className="mt-3 text-xs text-muted">Names never go to Qloo or the AI model. Only your favourites do.</p>
      </div>
    </div>
  );
}
