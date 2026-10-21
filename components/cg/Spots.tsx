'use client';

import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ChevronDown, Loader2, MapPin } from 'lucide-react';
import type { Session } from '../../lib/cg/types';
import { Art } from './ui';

const KINDS = [
  { k: 'food', label: 'Food', e: '🍽️' },
  { k: 'coffee', label: 'Coffee', e: '☕' },
  { k: 'drinks', label: 'Drinks', e: '🍸' },
  { k: 'outdoors', label: 'Outdoors', e: '🌳' },
  { k: 'music', label: 'Live music', e: '🎶' }
] as const;
const WHERE_KEY = 'cg-spots-where-v1';

interface Spot {
  id: string;
  name: string;
  address?: string;
  website?: string;
  image?: string;
  lat?: number;
  lng?: number;
  tags: string[];
  rankA?: number;
  rankB?: number;
  of: number;
}

/** Date spots within 30 km: one line until opened, so the plan stays short. */
export function Spots({ session }: { session: Session }) {
  const [A, B] = session.people;
  const [open, setOpen] = useState(false);
  const [where, setWhere] = useState('');
  const [kind, setKind] = useState<(typeof KINDS)[number]['k']>('food');
  const [spots, setSpots] = useState<Spot[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      setWhere(localStorage.getItem(WHERE_KEY) || '');
    } catch {
      /* ignore */
    }
  }, []);

  const ids = (p: typeof A) => [...p.favourites.filter((f) => f.qlooEntityId).map((f) => f.qlooEntityId!), ...p.liked.map((l) => l.qlooEntityId)];

  const search = async (k = kind) => {
    if (where.trim().length < 3) return setError('Type your area or address first.');
    setBusy(true);
    setError(null);
    try {
      localStorage.setItem(WHERE_KEY, where.trim());
    } catch {
      /* ignore */
    }
    try {
      const res = await fetch('/api/cg/spots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ a: ids(A), b: ids(B), where: where.trim(), kind: k })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Couldn’t find spots just now.');
      setSpots(j.spots);
    } catch (e: any) {
      setError(e.message);
      setSpots(null);
    } finally {
      setBusy(false);
    }
  };

  const half = (s: Spot) => Math.ceil(s.of / 2);
  const both = (s: Spot) => !!s.rankA && !!s.rankB && s.rankA <= half(s) && s.rankB <= half(s);
  const maps = (s: Spot) =>
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.lat && s.lng ? `${s.lat},${s.lng}` : `${s.name} ${s.address || ''}`)}`;

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left hover:border-ink/20" aria-expanded={false}>
        <MapPin className="h-5 w-5 shrink-0 text-a" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Going out instead?</span>
          <span className="block text-[13px] text-muted">Date spots within 30 km, for both your tastes</span>
        </span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden />
      </button>
    );

  return (
    <section className="rounded-3xl border border-line bg-card p-4" aria-labelledby="spots-title">
      <div className="flex items-start justify-between gap-2">
        <h2 id="spots-title" className="flex items-center gap-2 font-semibold">
          <MapPin className="h-5 w-5 text-a" aria-hidden /> Date spots near you
        </h2>
        <button type="button" onClick={() => setOpen(false)} className="min-h-[32px] px-1 text-sm font-medium text-muted hover:text-ink">
          Hide
        </button>
      </div>
      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <label className="sr-only" htmlFor="spots-where">
          Your area or address
        </label>
        <input
          id="spots-where"
          value={where}
          onChange={(e) => setWhere(e.target.value.slice(0, 100))}
          placeholder="Your area or address, e.g. Braamfontein"
          className="field min-w-0 flex-1"
          autoComplete="address-level2"
          enterKeyHint="search"
        />
        <button type="submit" disabled={busy} className="btn-primary shrink-0 px-4">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Find'}
        </button>
      </form>
      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="radiogroup" aria-label="Kind of spot">
        {KINDS.map((k) => (
          <button
            key={k.k}
            type="button"
            role="radio"
            aria-checked={kind === k.k}
            onClick={() => {
              setKind(k.k);
              if (where.trim().length >= 3) search(k.k);
            }}
            className={`min-h-[40px] shrink-0 rounded-full px-3 text-sm font-medium ${kind === k.k ? 'bg-ink text-white' : 'bg-paper text-muted hover:text-ink'}`}
          >
            <span aria-hidden>{k.e}</span> {k.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {busy && !spots && (
        <p className="mt-3 flex items-center gap-2 text-sm text-muted" role="status">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Asking Qloo for spots near {where}…
        </p>
      )}
      {spots && spots.length === 0 && <p className="mt-3 text-sm text-muted">Qloo found nothing of this kind near there. Try another kind, or a bigger area name.</p>}
      {spots && spots.length > 0 && (
        <ul className={`mt-3 divide-y divide-line ${busy ? 'opacity-60' : ''}`}>
          {spots.map((s) => (
            <li key={s.id} className="flex gap-3 py-3 first:pt-0">
              <Art src={s.image} type="urn:entity:place" className="h-14 w-14 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{s.name}</p>
                {s.address && <p className="truncate text-[13px] text-muted">{s.address}</p>}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {s.rankA && s.rankB && (
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${both(s) ? 'bg-shared-soft text-shared-ink' : 'bg-paper text-muted'}`}>
                      {both(s) ? 'Good for both of you' : `Leans towards ${s.rankA < s.rankB ? A.name : B.name}’s taste`}
                    </span>
                  )}
                  <a href={maps(s)} target="_blank" rel="noreferrer" className="inline-flex min-h-[32px] items-center gap-1 rounded-full bg-ink px-3 text-[13px] font-medium text-white">
                    Directions <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                  </a>
                  {s.website && (
                    <a href={s.website} target="_blank" rel="noreferrer" className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-line px-3 text-[13px] font-medium">
                      Website <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[12px] leading-snug text-muted">
        Qloo orders places near you by both your tastes, but for places, where you are matters more than taste. Check opening hours before you go. Your address is only used for this search.
      </p>
    </section>
  );
}
