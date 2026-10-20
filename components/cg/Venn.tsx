'use client';

import React, { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import type { Plan, Session } from '../../lib/cg/types';
import { Art } from './ui';

/** The overlap of two tastes, drawn as it is: two circles and the tags Qloo finds in common. */
export function Venn({ session, plan }: { session: Session; plan: Plan }) {
  const [A, B] = session.people;
  const [copied, setCopied] = useState(false);
  const confirmed = plan.commonGround.filter((t) => t.confirmed);
  const shown = confirmed.length ? confirmed : plan.commonGround;
  const lead = shown[0]?.name;
  const leadText = lead && lead.length > 14 ? `${lead.slice(0, 13)}…` : lead;

  const share = async () => {
    const tags = shown.slice(0, 4).map((t) => t.name).join(', ');
    const text = `${A.name} and ${B.name} have this in common: ${tags || 'more than we thought'}.${plan.watch ? ` Tonight we're watching ${plan.watch.name}.` : ''} Planned with Common Ground.`;
    const url = typeof window !== 'undefined' ? window.location.origin : '';
    try {
      if (navigator.share) await navigator.share({ text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* share sheet closed */
    }
  };

  const favs = (p: Session['people'][number]) => p.favourites.filter((f) => f.qlooEntityId);

  return (
    <section className="rounded-3xl border border-line bg-card p-5 sm:p-7" aria-labelledby="venn-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="venn-title" className="text-xl font-semibold sm:text-2xl">
          Where your tastes meet
        </h2>
        <button type="button" onClick={share} className="btn-quiet shrink-0">
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />}
          {copied ? 'Copied' : 'Share'}
        </button>
      </div>

      <svg viewBox="0 0 360 214" className="mx-auto mt-3 w-full max-w-md" role="img" aria-label={`${A.name} and ${B.name} overlap on ${shown.map((t) => t.name).join(', ') || 'nothing Qloo could find'}`}>
        <defs>
          <clipPath id="venn-a">
            <circle cx="140" cy="107" r="100" />
          </clipPath>
        </defs>
        <circle cx="140" cy="107" r="100" fill="#D6336C" fillOpacity="0.12" stroke="#D6336C" strokeWidth="1.5" />
        <circle cx="220" cy="107" r="100" fill="#2B63D9" fillOpacity="0.12" stroke="#2B63D9" strokeWidth="1.5" />
        <g className="cg-lens">
          <circle cx="220" cy="107" r="100" fill="#6F42C1" clipPath="url(#venn-a)" />
          {leadText ? (
            <>
              <text x="180" y="104" textAnchor="middle" fill="#fff" fontSize="17" fontWeight="600" fontFamily="Bricolage Grotesque, sans-serif">
                {leadText}
              </text>
              {shown.length > 1 && (
                <text x="180" y="126" textAnchor="middle" fill="#fff" fillOpacity="0.85" fontSize="12.5">
                  and {shown.length - 1} more
                </text>
              )}
            </>
          ) : (
            <text x="180" y="112" textAnchor="middle" fill="#fff" fontSize="13">
              No tags
            </text>
          )}
        </g>
        <text x="78" y="102" textAnchor="middle" fill="#A61E4D" fontSize="16" fontWeight="600" fontFamily="Bricolage Grotesque, sans-serif">
          {A.name.slice(0, 12)}
        </text>
        <text x="78" y="122" textAnchor="middle" fill="#5F5B72" fontSize="11.5">
          {favs(A).length} favourite{favs(A).length === 1 ? '' : 's'}
        </text>
        <text x="282" y="102" textAnchor="middle" fill="#1C4AAE" fontSize="16" fontWeight="600" fontFamily="Bricolage Grotesque, sans-serif">
          {B.name.slice(0, 12)}
        </text>
        <text x="282" y="122" textAnchor="middle" fill="#5F5B72" fontSize="11.5">
          {favs(B).length} favourite{favs(B).length === 1 ? '' : 's'}
        </text>
      </svg>

      {shown.length > 0 && (
        <ul className="mt-2 flex flex-wrap justify-center gap-2" aria-label="Shared taste tags">
          {shown.map((t) => (
            <li
              key={t.name}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${t.confirmed ? 'bg-shared-soft text-shared-ink' : 'border border-dashed border-shared/50 text-shared-ink'}`}
            >
              {t.name}
            </li>
          ))}
        </ul>
      )}
      <p className="mx-auto mt-3 max-w-md text-center text-xs leading-relaxed text-muted">
        {confirmed.length
          ? 'Tags from Qloo’s comparison of your favourites that also appear on both people’s own favourites.'
          : 'Tags from Qloo’s comparison. None appear on both people’s own favourites, so treat them as a loose overlap.'}
      </p>

      <div className="mt-5 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        {[
          { p: A, tone: 'text-a-ink', ring: 'ring-a' },
          { p: B, tone: 'text-b-ink', ring: 'ring-b' }
        ].map(({ p, tone, ring }) => (
          <div key={p.id} className="flex min-w-0 items-center gap-3">
            <div className="flex -space-x-2">
              {favs(p)
                .slice(0, 3)
                .map((f) => (
                  <Art key={f.id} src={f.image} type={f.type} className={`h-9 w-9 rounded-full ring-2 ${ring}`} />
                ))}
            </div>
            <p className="min-w-0 text-sm">
              <span className={`font-semibold ${tone}`}>{p.name}</span>{' '}
              <span className="text-muted">loves {favs(p).map((f) => f.qlooName || f.query).join(', ') || 'nothing Qloo recognised'}</span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
