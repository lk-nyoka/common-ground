'use client';

import React, { useMemo, useState } from 'react';
import { decodeResult, summarise, type MethodSummary } from '../../../lib/cg/study';
import { Mark } from '../../../components/cg/ui';

/** Paste the result codes participants sent; everything is computed in this browser. */
export default function StudyResults() {
  const [text, setText] = useState('');
  const parsed = useMemo(() => {
    const codes = text.split(/[\s,]+/).map((c) => c.replace(/^.*result:\s*/i, '')).filter((c) => c.length > 20);
    const results = codes.map(decodeResult);
    const ok = results.filter(Boolean) as NonNullable<ReturnType<typeof decodeResult>>[];
    // The same code pasted twice is one pair, not two.
    const unique = ok.filter((r, i) => ok.findIndex((x) => x.pair === r.pair && x.at === r.at) === i);
    return { ok: unique, bad: results.filter((r) => !r).length, dupes: ok.length - unique.length };
  }, [text]);
  const s = summarise(parsed.ok);
  const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '–');
  const row = (label: string, m: MethodSummary) => (
    <tr className="border-t border-line">
      <th scope="row" className="py-2 pr-4 text-left font-medium">
        {label}
      </th>
      <td className="py-2 pr-4 tabular-nums">{m.items}</td>
      <td className="py-2 pr-4 tabular-nums">{pct(m.bothYes, m.items)}</td>
      <td className="py-2 pr-4 tabular-nums">{pct(m.vetoed, m.items)}</td>
      <td className="py-2 tabular-nums">{m.items ? m.worstOffScore.toFixed(2) : '–'}</td>
    </tr>
  );
  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-4 sm:px-6">
        <Mark size={20} />
        <span className="font-display text-lg font-semibold">Study results</span>
      </header>
      <div className="mx-auto max-w-2xl space-y-5 px-4 pb-16 sm:px-6">
        <p className="text-muted">Paste the result codes you received, one per line. Nothing leaves this page.</p>
        <textarea className="field h-40 font-mono text-xs" value={text} onChange={(e) => setText(e.target.value)} aria-label="Result codes" />
        <p className="text-sm text-muted">
          {parsed.ok.length} pair{parsed.ok.length === 1 ? '' : 's'} read{parsed.dupes ? `, ${parsed.dupes} duplicate${parsed.dupes === 1 ? '' : 's'} ignored` : ''}
          {parsed.bad ? `, ${parsed.bad} code${parsed.bad === 1 ? '' : 's'} not recognised` : ''}.
        </p>
        <div className="overflow-x-auto rounded-3xl border border-line bg-card p-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-2 pr-4 font-medium">Method</th>
                <th className="pb-2 pr-4 font-medium">Picks rated</th>
                <th className="pb-2 pr-4 font-medium">Both said yes</th>
                <th className="pb-2 pr-4 font-medium">Someone said no</th>
                <th className="pb-2 font-medium">Worst-off score</th>
              </tr>
            </thead>
            <tbody>
              {row('Common Ground', s.qloo)}
              {row('AI alone', s.llm)}
            </tbody>
          </table>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            Worst-off score: for each pick, the lower of the two people’s answers (yes 1, maybe 0.5, no 0), averaged. Picks both methods suggested count for both. With a small number of pairs,
            treat differences as a hint, not proof.
          </p>
        </div>
      </div>
    </main>
  );
}
