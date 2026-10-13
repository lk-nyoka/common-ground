'use client';

import React from 'react';
import { Domain, DomainStats } from '../lib/types';
import { DOMAIN_LABEL, domainsToRest, tally } from '../lib/care-logic';

interface MemoryPortraitProps {
  name: string;
  stats: DomainStats;
  dark?: boolean;
}

/** What has reached this person, counted from logged visits. No scores, only counts. */
export function MemoryPortrait({ name, stats, dark }: MemoryPortraitProps) {
  const rest = domainsToRest(stats);
  const domains = (Object.keys(stats) as Domain[])
    .filter((d) => tally(stats, d).tried > 0)
    .sort((a, b) => tally(stats, b).tried - tally(stats, a).tried);

  const ink = dark ? 'text-stone-100' : 'text-stone-900';
  const quiet = dark ? 'text-stone-400' : 'text-stone-500';
  const track = dark ? 'bg-stone-800' : 'bg-stone-200';

  return (
    <div className={`rounded-2xl p-5 border ${dark ? 'bg-stone-950/50 border-stone-800' : 'bg-white border-stone-200'}`}>
      <div className={`text-[11px] font-mono uppercase tracking-wider ${quiet}`}>What reaches {name}</div>
      {domains.length === 0 ? (
        <p className={`text-xs mt-2 ${quiet}`}>Nothing logged yet. After the first visit, this shows what reaches {name}.</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {domains.map((d) => {
            const t = tally(stats, d);
            const pct = Math.round((t.litUp / t.tried) * 100);
            return (
              <li key={d} className="text-xs">
                <div className="flex items-baseline justify-between gap-3">
                  <span className={`font-bold capitalize ${ink}`}>{DOMAIN_LABEL[d]}</span>
                  <span className={quiet}>
                    reached {name} {t.litUp} of {t.tried} {t.tried === 1 ? 'time' : 'times'}
                    {t.upset ? ` · ${t.upset} upset` : ''}
                    {rest.includes(d) ? ' · resting' : ''}
                  </span>
                </div>
                <div className={`mt-1 h-1.5 rounded-full ${track}`} aria-hidden="true">
                  <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
