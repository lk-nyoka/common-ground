'use client';

import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Pick } from '../../lib/cg/types';

/**
 * The Mutual Fit Proof: where a pick ranks for each person's own taste among tonight's candidates,
 * and how much each person's favourites drove it. Every number here comes from Qloo.
 */
export function FitProof({ pick, names }: { pick: Pick; names: [string, string] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const fit = pick.fit;
  if (!fit || (!fit.a && !fit.b)) return null;

  const rows = (
    [
      { key: 'a' as const, name: names[0], f: fit.a, bar: 'bg-a', text: 'text-a-ink' },
      { key: 'b' as const, name: names[1], f: fit.b, bar: 'bg-b', text: 'text-b-ink' }
    ] as const
  ).filter((r) => r.f);

  const width = (rank: number) => (fit.of <= 1 ? 100 : Math.max(8, Math.round(((fit.of - rank) / (fit.of - 1)) * 100)));

  return (
    <div className="mt-3 rounded-2xl bg-paper p-3">
      <dl className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[minmax(0,5.5rem)_1fr_auto] items-center gap-2.5 text-sm">
            <dt className={`truncate font-medium ${r.text}`}>{r.name}</dt>
            <dd className="h-2 overflow-hidden rounded-full bg-line" aria-hidden>
              <div className={`h-full rounded-full ${r.bar}`} style={{ width: `${width(r.f!.rank)}%` }} />
            </dd>
            <dd className="tabular-nums text-muted">
              <span className="font-semibold text-ink">#{r.f!.rank}</span> of {fit.of}
            </dd>
          </div>
        ))}
      </dl>

      {fit.share && (
        <div className="mt-3">
          <p className="text-xs text-muted">How much each of your favourites pulled this pick</p>
          <div className="mt-1.5 flex h-2 overflow-hidden rounded-full" aria-hidden>
            <div className="bg-a" style={{ width: `${Math.round(fit.share.a * 100)}%` }} />
            <div className="bg-b" style={{ width: `${Math.round(fit.share.b * 100)}%` }} />
          </div>
          <p className="mt-1 flex justify-between text-xs tabular-nums">
            <span className="text-a-ink">
              {names[0]} {Math.round(fit.share.a * 100)}%
            </span>
            <span className="text-b-ink">
              {names[1]} {Math.round(fit.share.b * 100)}%
            </span>
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={id}
        className="mt-2 inline-flex min-h-[36px] items-center gap-1 text-xs font-medium text-muted hover:text-ink"
      >
        What these numbers mean
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <div id={id} className="space-y-1.5 pb-1 text-xs leading-relaxed text-muted">
          <p>
            Qloo scored all {fit.of} candidates against each person’s favourites on their own, then we ranked them.
            {rows.map((r) => ` ${r.name}: affinity ${r.f!.affinity.toFixed(2)}.`).join('')}
          </p>
          {fit.share && <p>The split is Qloo’s explainability: how much each person’s favourites drove this result.</p>}
          {fit.jointRank && <p>For both of your tastes together, Qloo put it at #{fit.jointRank}.</p>}
          <p>These describe what people with similar favourites tend to like. They are not a promise that either of you will love it.</p>
        </div>
      )}
    </div>
  );
}
