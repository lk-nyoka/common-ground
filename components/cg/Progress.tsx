'use client';

import React from 'react';
import { Check } from 'lucide-react';
import type { AgentTraceStep } from '../../lib/types';
import { Mark } from './ui';

/** Turn a real agent step into one short line. Steps are never invented here; unknown ones are skipped. */
function lineFor(s: AgentTraceStep): string | null {
  const d = s.details.replace(/\s*\[[^\]]*\]/g, '').trim();
  switch (s.action) {
    case 'Privacy':
      return 'Keeping your names out of Qloo and the AI';
    case 'qloo_search result':
      return d.startsWith('Matched') ? d.replace(/\.$/, '') : d.replace(/;.*$/, '');
    case 'qloo_related result':
      return null; // summarised by the scoring step, to keep the list short
    case 'qloo_compare result': {
      const n = d.match(/(\d+) confirmed/);
      return n ? `Found ${n[1]} tastes you share` : 'Compared your tastes';
    }
    case 'qloo_score':
      return 'Scoring every candidate for each of you';
    case 'qloo_score result':
      return d.startsWith('No') ? 'Qloo couldn’t score the candidates this time' : 'Ranked every candidate for each of you';
    case 'Agent briefed':
      return 'The AI planner is choosing from Qloo’s results';
    case 'Checked the pick is fair':
      return 'Checked tonight’s pick is fair to you both';
    case 'Replaced an unfair pick':
      return 'Swapped a pick that suited only one of you';
    case 'LLM agent failed':
      return 'The AI was busy, so the rules are choosing';
    default:
      return s.type === 'synthesis' ? 'Putting your night together' : null;
  }
}

export function Progress({ steps }: { steps: AgentTraceStep[] }) {
  const lines = steps.map(lineFor).filter((l): l is string => !!l);
  const unique = lines.filter((l, i) => lines.indexOf(l) === i).slice(-7);
  return (
    <div className="flex flex-col items-center py-16 text-center" role="status" aria-live="polite">
      <Mark size={44} className="cg-pulse" />
      <h2 className="mt-6 text-2xl font-semibold">Finding your common ground</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">This usually takes 10 to 25 seconds. Here’s what the agent is doing right now.</p>
      <ol className="mt-6 w-full max-w-sm space-y-2 text-left text-sm">
        {unique.length === 0 && <li className="text-muted">Starting…</li>}
        {unique.map((l, i) => {
          const current = i === unique.length - 1;
          return (
            <li key={l} className="flex items-start gap-2.5">
              {current ? (
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-shared cg-pulse" aria-hidden />
              ) : (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-shared" aria-hidden />
              )}
              <span className={current ? 'font-medium' : 'text-muted'}>{l}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
