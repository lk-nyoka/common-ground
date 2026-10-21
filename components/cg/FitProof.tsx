'use client';

import React, { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Pick } from '../../lib/cg/types';

/**
 * The Mutual Fit Proof: where a pick ranks for each person's own taste among tonight's candidates,
 * and how much each person's favourites drove it. Every number here comes from Qloo.
 */
/** compact: a one-line summary with the full proof behind "Why this pick?" (used for every pick but the main one). */
export function FitProof({ pick, names, compact = false }: { pick: Pick; names: [string, string]; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
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

  // A plain verdict, so a pick in the bottom half for someone is never presented as suiting both.
  const half = Math.ceil(fit.of / 2);
  const both = fit.a && fit.b;
  const topBoth = both && fit.a!.rank <= half && fit.b!.rank <= half;
  const lowFor = both && !topBoth ? (fit.a!.rank > fit.b!.rank ? names[0] : names[1]) : undefined;
  const verdict = !both
    ? undefined
    : topBoth
    ? { text: `Top half for both of you among ${fit.of} candidates`, cls: 'bg-shared-soft text-shared-ink' }
    : { text: `Fairest of tonight’s options, but lower for ${lowFor}`, cls: 'bg-a-soft text-a-ink' };

  if (compact && !more)
    return (
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        {verdict ? (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${verdict.cls}`}>{topBoth ? 'Good for both of you' : `Leans towards ${lowFor === names[0] ? names[1] : names[0]}’s taste`}</span>
        ) : (
          rows[0] && <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-muted">Picked for {rows.map((r) => r.name).join(' and ')}</span>
        )}
        <button type="button" onClick={() => setMore(true)} aria-expanded={false} className="min-h-[32px] font-medium text-shared-ink underline underline-offset-2">
          Why this pick?
        </button>
      </div>
    );

  return (
    <div className="mt-3 rounded-2xl bg-paper p-3">
      {compact && (
        <button type="button" onClick={() => setMore(false)} className="float-right -mr-1 -mt-1 min-h-[32px] px-1 text-xs font-medium text-muted hover:text-ink">
          Hide
        </button>
      )}
      {verdict && <p className={`mb-2 inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${verdict.cls}`}>{verdict.text}</p>}
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

      {rows.some((r) => r.f!.via === 'tags') && (
        <p className="mt-2 text-xs text-muted">
          {rows.filter((r) => r.f!.via === 'tags').map((r) => r.name).join(' and ')}’s rank comes from the tags of their favourites, because Qloo has no direct score
          across these kinds (for example, films for someone who only added music).
        </p>
      )}

      {fit.share && (
        <div className="mt-3">
          <p className="text-xs text-muted">Each person’s share of the signal behind this pick (Qloo explainability)</p>
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
          {fit.share && <p>The split comes from Qloo’s explainability output: each person’s favourites’ share of the signal behind this result. It isn’t a measure of how much either of you will enjoy it.</p>}
          {fit.jointRank && <p>For both of your tastes together, Qloo put it at #{fit.jointRank}.</p>}
          <p>These describe what people with similar favourites tend to like. They are not a promise that either of you will love it.</p>
        </div>
      )}
    </div>
  );
}
