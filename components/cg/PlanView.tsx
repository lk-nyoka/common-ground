'use client';

import React, { useMemo, useState } from 'react';
import { ArrowUpRight, ChevronDown, Film, Music2, RefreshCw, Share2, Tv } from 'lucide-react';
import type { Pick, Plan, Session, Verdict } from '../../lib/cg/types';
import { picksOf, sharedHitRate, summarise } from '../../lib/cg/learn';

function TypeIcon({ type, className = 'h-5 w-5' }: { type: string; className?: string }) {
  if (type.includes('artist')) return <Music2 className={className} />;
  if (type.includes('tv')) return <Tv className={className} />;
  return <Film className={className} />;
}

function Art({ src, type, className }: { src?: string; type: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed)
    return (
      <div className={`flex items-center justify-center bg-paper text-muted ${className}`}>
        <TypeIcon type={type} />
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

function Badge({ pick }: { pick: Pick }) {
  return (
    <span
      className="rounded-full border border-line px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted"
      title={pick.provenance === 'qloo_live' ? 'Returned by Qloo just now' : `Saved Qloo response${pick.capturedAt ? ` from ${pick.capturedAt.slice(0, 10)}` : ''}`}
    >
      {pick.provenance === 'qloo_live' ? 'Qloo live' : 'Qloo saved'}
    </span>
  );
}

function VerdictButtons({ pick, value, onChange, names }: { pick: Pick; value?: Verdict; onChange: (v?: Verdict) => void; names: [string, string] }) {
  const opts: { v: Verdict; label: string }[] = [
    { v: 'both', label: 'Both' },
    { v: 'a', label: names[0] },
    { v: 'b', label: names[1] },
    { v: 'neither', label: 'Neither' }
  ];
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={`Who liked ${pick.name}?`}>
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(value === o.v ? undefined : o.v)}
          aria-pressed={value === o.v}
          className={`max-w-[7.5rem] truncate rounded-full border px-2 py-1 text-xs ${
            value === o.v
              ? o.v === 'both'
                ? 'border-accent bg-accent text-white'
                : o.v === 'a'
                ? 'border-personA bg-personA text-white'
                : o.v === 'b'
                ? 'border-personB bg-personB text-white'
                : 'border-ink bg-ink text-white'
              : 'border-line text-muted hover:border-ink/40 hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function meta(p: Pick) {
  const bits = [p.type.includes('artist') ? 'Music' : p.type.includes('tv') ? 'TV' : 'Film'];
  if (p.year) bits.push(String(p.year));
  else if (p.activeFrom) bits.push(`from ${p.activeFrom}`);
  if (p.contentRating) bits.push(p.contentRating);
  return bits.join(' · ');
}

function PickRow({ pick, verdict, setVerdict, names, large }: { pick: Pick; verdict?: Verdict; setVerdict: (v?: Verdict) => void; names: [string, string]; large?: boolean }) {
  return (
    <div className="flex gap-4">
      <Art src={pick.image} type={pick.type} className={large ? 'h-40 w-[6.75rem] shrink-0 rounded-xl sm:h-60 sm:w-40' : 'h-16 w-16 shrink-0 rounded-lg'} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`font-semibold ${large ? 'font-display text-2xl' : ''}`}>{pick.name}</h3>
          <Badge pick={pick} />
        </div>
        <p className="mt-0.5 text-xs text-muted">{meta(pick)}</p>
        <p className={`mt-2 text-sm ${large ? '' : 'text-ink/80'}`}>{pick.reason}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <VerdictButtons pick={pick} value={verdict} onChange={setVerdict} names={names} />
          {pick.link && (
            <a href={pick.link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-xs text-muted underline-offset-2 hover:text-ink hover:underline">
              {pick.link.label} <ArrowUpRight className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function CommonGroundCard({ session, plan }: { session: Session; plan: Plan }) {
  const [A, B] = session.people;
  const [copied, setCopied] = useState(false);
  const confirmed = plan.commonGround.filter((t) => t.confirmed);
  const shown = confirmed.length ? confirmed : plan.commonGround.slice(0, 4);
  const share = async () => {
    const text = `${A.name} & ${B.name} click on: ${shown.map((t) => t.name).join(' · ')}.${plan.watch ? ` Tonight: ${plan.watch.name}.` : ''} Found with Common Ground (Qloo taste data).`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* cancelled */
    }
  };
  const favs = (p: Session['people'][number]) => p.favourites.filter((f) => f.qlooEntityId);
  return (
    <section className="overflow-hidden rounded-3xl bg-ink text-white">
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm text-white/60">
            <span className="text-personA-light">{A.name}</span> & <span className="text-personB-light">{B.name}</span> click on
          </p>
          <button type="button" onClick={share} className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
            <Share2 className="h-3.5 w-3.5" /> {copied ? 'Copied' : 'Share'}
          </button>
        </div>
        {shown.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {shown.map((t) => (
              <span
                key={t.name}
                className={`rounded-full px-3.5 py-1.5 font-display text-lg sm:text-xl ${t.confirmed ? 'bg-white text-ink' : 'border border-dashed border-white/40 text-white/80'}`}
                title={t.confirmed ? 'Qloo compare tag, also on both people’s own favourites' : 'Qloo compare tag only'}
              >
                {t.name}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 font-display text-xl text-white/70">Qloo found no shared tags for these favourites.</p>
        )}
        <div className="mt-6 flex items-center gap-4 text-xs text-white/60">
          {[favs(A), favs(B)].map((list, i) => (
            <div key={i} className="flex min-w-0 items-center gap-2">
              <div className="flex -space-x-2">
                {list.slice(0, 3).map((f) => (
                  <Art key={f.id} src={f.image} type={f.type} className={`h-8 w-8 rounded-full ring-2 ${i === 0 ? 'ring-personA' : 'ring-personB'}`} />
                ))}
              </div>
              <span className="truncate">{list.map((f) => f.qlooName || f.query).join(', ')}</span>
            </div>
          ))}
        </div>
      </div>
      {confirmed.length > 0 && confirmed.length < plan.commonGround.length && (
        <p className="border-t border-white/10 px-6 py-2.5 text-[11px] text-white/45 sm:px-8">
          Shown: tags Qloo’s compare returned that also appear on both of your own favourites.
        </p>
      )}
    </section>
  );
}

function Learning({ session }: { session: Session }) {
  const s = summarise(session);
  const rate = sharedHitRate(session);
  if (!s) return null;
  const line = (label: string, items: string[]) =>
    items.length ? (
      <p>
        <span className="text-muted">{label}:</span> {items.join(', ')}
      </p>
    ) : null;
  return (
    <section className="rounded-2xl border border-line bg-card p-5 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">What plan {session.feedback[0].planNumber} taught the agent</h2>
        <p className="text-muted">
          Shared hits so far: <strong className="text-ink">{rate.both}</strong> of {rate.tried} tried
        </p>
      </div>
      <div className="mt-3 space-y-1">
        {line('You both loved (now a signal for you both)', s.both)}
        {line(`Only ${s.aName} (a signal for ${s.aName})`, s.onlyA)}
        {line(`Only ${s.bName} (a signal for ${s.bName})`, s.onlyB)}
        {line('Neither (never suggested again)', s.neither)}
      </div>
    </section>
  );
}

function Trace({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  const calls = plan.trace.filter((t) => t.type === 'tool_call').length;
  return (
    <section className="rounded-2xl border border-line bg-card">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-4 text-left text-sm" aria-expanded={open}>
        <span>
          <span className="font-semibold">How the agent got here</span>
          <span className="ml-2 text-muted">
            {calls} Qloo calls · {plan.planner === 'llm' ? `planned by ${plan.plannerModel}` : 'planned by rules'}
          </span>
        </span>
        <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ol className="space-y-2 border-t border-line px-5 py-4 font-mono text-[12px] leading-relaxed">
          {plan.trace.map((t) => (
            <li key={t.step} className="flex gap-3">
              <span
                className={`mt-0.5 shrink-0 rounded px-1.5 text-[10px] uppercase ${
                  t.type === 'tool_call' ? 'bg-personB/10 text-personB' : t.type === 'tool_result' ? 'bg-personA/10 text-personA' : t.type === 'guardrail' ? 'bg-accent/10 text-accent' : 'bg-paper text-muted'
                }`}
              >
                {t.type.replace('_', ' ')}
              </span>
              <span className="min-w-0 break-words">
                <span className="font-semibold">{t.action}</span> <span className="text-muted">{t.details}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function PlanView({ session, busy, onFeedback, onReset }: { session: Session; busy: boolean; onFeedback: (v: Record<string, Verdict>) => void; onReset: () => void }) {
  const plan = session.plans[0];
  const [A, B] = session.people;
  const names: [string, string] = [A.name, B.name];
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const picks = useMemo(() => (plan ? picksOf(plan) : []), [plan]);
  const set = (id: string) => (v?: Verdict) =>
    setVerdicts((cur) => {
      const next = { ...cur };
      if (v) next[id] = v;
      else delete next[id];
      return next;
    });
  if (!plan) return null;
  const rated = Object.keys(verdicts).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pt-4 text-sm">
        <p className="text-muted">
          Plan {plan.number}
          {plan.number > 1 ? ' · adapted from your feedback' : ''} · {plan.minutes} min at home
        </p>
        <button type="button" onClick={onReset} className="shrink-0 whitespace-nowrap text-muted underline-offset-2 hover:text-ink hover:underline">
          Start over
        </button>
      </div>

      {plan.notices.length > 0 && (
        <div className="space-y-1 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
          {plan.notices.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
        </div>
      )}

      {session.feedback.length > 0 && <Learning session={session} />}

      <CommonGroundCard session={session} plan={plan} />

      {picks.length > 0 && (
        <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Tonight</p>
          <p className="mt-1 font-display text-xl leading-snug sm:text-2xl">{plan.tonight}</p>
        </section>
      )}

      {plan.watch && (
        <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted">Watch together</p>
          <PickRow pick={plan.watch} verdict={verdicts[plan.watch.id]} setVerdict={set(plan.watch.id)} names={names} large />
          {plan.alsoWatch.length > 0 && (
            <div className="mt-6 space-y-4 border-t border-line pt-5">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Or instead</p>
              {plan.alsoWatch.map((p) => (
                <PickRow key={p.id} pick={p} verdict={verdicts[p.id]} setVerdict={set(p.id)} names={names} />
              ))}
            </div>
          )}
        </section>
      )}

      {plan.listen.length > 0 && (
        <section className="rounded-2xl border border-line bg-card p-5 sm:p-6">
          <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted">Put on together</p>
          <div className="space-y-5">
            {plan.listen.map((p) => (
              <PickRow key={p.id} pick={p} verdict={verdicts[p.id]} setVerdict={set(p.id)} names={names} />
            ))}
          </div>
        </section>
      )}

      {(plan.swap.forA || plan.swap.forB) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {[
            { p: plan.swap.forA, to: A.name, from: B.name, tone: 'border-t-personA' },
            { p: plan.swap.forB, to: B.name, from: A.name, tone: 'border-t-personB' }
          ].map(({ p, to, from, tone }) =>
            p ? (
              <div key={p.id} className={`rounded-2xl border border-line border-t-4 bg-card p-5 ${tone}`}>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                  Swap · {to}, try this from {from}’s world
                </p>
                <PickRow pick={p} verdict={verdicts[p.id]} setVerdict={set(p.id)} names={names} />
              </div>
            ) : null
          )}
        </section>
      )}

      {plan.why.length > 0 && picks.length > 0 && (
        <section className="px-1 text-sm text-muted">
          <p className="mb-1 font-medium text-ink">Why this plan</p>
          <ul className="list-disc space-y-0.5 pl-5">
            {plan.why.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {picks.length > 0 && (
        <section className="sticky bottom-4 z-10 flex flex-col items-center gap-2 rounded-2xl border border-line bg-card/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:justify-between">
          <p className="text-sm text-muted">
            {rated ? `${rated} of ${picks.length} rated. Skip anything you didn’t try.` : 'After your night, tap who liked what.'}
          </p>
          <button
            type="button"
            disabled={!rated || busy}
            onClick={() => onFeedback(verdicts)}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> {busy ? 'Planning…' : 'Plan our next night'}
          </button>
        </section>
      )}

      <Trace plan={plan} />
    </div>
  );
}
