'use client';

import React, { useMemo, useState } from 'react';
import { ArrowUpRight, ChevronDown, RefreshCw } from 'lucide-react';
import type { Pick, Plan, Session, Verdict } from '../../lib/cg/types';
import { picksOf, sharedHitRate, summarise } from '../../lib/cg/learn';
import { Venn } from './Venn';
import { FitProof } from './FitProof';
import { Art, minutesLabel, typeLabel } from './ui';

function meta(p: Pick) {
  const bits: string[] = [typeLabel(p.type)];
  if (p.year) bits.push(String(p.year));
  else if (p.activeFrom) bits.push(`since ${p.activeFrom}`);
  if (p.durationMinutes && !p.type.includes('artist')) bits.push(p.type.includes('tv') ? `${p.durationMinutes} min episodes` : minutesLabel(p.durationMinutes));
  if (p.contentRating) bits.push(p.contentRating);
  return bits.join(', ');
}

function VerdictButtons({ pick, value, onChange, names }: { pick: Pick; value?: Verdict; onChange: (v?: Verdict) => void; names: [string, string] }) {
  const opts: { v: Verdict; label: string; on: string }[] = [
    { v: 'both', label: 'We both liked it', on: 'border-shared bg-shared text-white' },
    { v: 'a', label: `Only ${names[0]}`, on: 'border-a bg-a text-white' },
    { v: 'b', label: `Only ${names[1]}`, on: 'border-b bg-b text-white' },
    { v: 'neither', label: 'Neither', on: 'border-ink bg-ink text-white' }
  ];
  return (
    <fieldset className="mt-3">
      <legend className="sr-only">Who liked {pick.name}?</legend>
      <div className="flex flex-wrap gap-1.5">
        {opts.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(value === o.v ? undefined : o.v)}
            aria-pressed={value === o.v}
            className={`min-h-[40px] max-w-[11rem] truncate rounded-full border px-3 text-[13px] transition ${
              value === o.v ? o.on : 'border-line bg-card text-muted hover:border-ink/30 hover:text-ink'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function PickBlock({
  pick,
  verdict,
  setVerdict,
  names,
  hero,
  rate
}: {
  pick: Pick;
  verdict?: Verdict;
  setVerdict: (v?: Verdict) => void;
  names: [string, string];
  hero?: boolean;
  rate: boolean;
}) {
  return (
    <article>
      <div className="flex gap-4">
        <Art src={pick.image} type={pick.type} className={hero ? 'h-40 w-[6.75rem] shrink-0 rounded-xl sm:h-56 sm:w-[9.5rem]' : 'h-16 w-16 shrink-0 rounded-xl'} />
        <div className="min-w-0 flex-1">
          <h3 className={hero ? 'text-2xl font-semibold leading-tight sm:text-3xl' : 'text-[17px] font-semibold leading-snug'}>{pick.name}</h3>
          <p className="mt-1 text-[13px] text-muted">{meta(pick)}</p>
          <p className="mt-2 text-[15px] leading-relaxed">{pick.reason}</p>
        </div>
      </div>
      <FitProof pick={pick} names={names} />
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
        {pick.link && (
          <a href={pick.link.url} target="_blank" rel="noreferrer" className="inline-flex min-h-[36px] items-center gap-1 font-medium text-shared-ink underline-offset-2 hover:underline">
            {pick.link.label}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
        <span className="text-muted" title={pick.provenance === 'qloo_saved' && pick.capturedAt ? `Saved ${pick.capturedAt.slice(0, 10)}` : undefined}>
          {pick.provenance === 'qloo_live' ? 'From Qloo just now' : 'From a saved Qloo response'}
        </span>
      </div>
      {rate && <VerdictButtons pick={pick} value={verdict} onChange={setVerdict} names={names} />}
    </article>
  );
}

function Learning({ session }: { session: Session }) {
  const s = summarise(session);
  const rate = sharedHitRate(session);
  if (!s) return null;
  const line = (label: string, items: string[]) =>
    items.length ? (
      <li>
        <span className="text-muted">{label}</span> {items.join(', ')}
      </li>
    ) : null;
  return (
    <section className="rounded-3xl border border-shared/25 bg-shared-soft p-5 sm:p-6" aria-labelledby="learned-title">
      <h2 id="learned-title" className="text-lg font-semibold">
        What night {session.feedback[0].planNumber} taught us
      </h2>
      <p className="mt-1 text-sm text-shared-ink">
        You both liked <strong>{rate.both}</strong> of the {rate.tried} things you’ve tried so far.
      </p>
      <ul className="mt-3 space-y-1 text-sm">
        {line('Both liked, so tonight starts from them:', s.both)}
        {line(`Only ${s.aName} liked, so they now shape ${s.aName}’s side:`, s.onlyA)}
        {line(`Only ${s.bName} liked, so they now shape ${s.bName}’s side:`, s.onlyB)}
        {line('Neither liked, so they won’t come back:', s.neither)}
      </ul>
    </section>
  );
}

function Trace({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  const calls = plan.trace.filter((t) => t.type === 'tool_call').length;
  const checks = plan.trace.filter((t) => t.type === 'guardrail').length;
  return (
    <section className="rounded-3xl border border-line bg-card">
      <button type="button" onClick={() => setOpen(!open)} className="flex min-h-[56px] w-full items-center justify-between gap-3 px-5 text-left" aria-expanded={open}>
        <span>
          <span className="font-semibold">How the agent planned this</span>
          <span className="block text-sm text-muted">
            {calls} Qloo steps and {checks} checks, planned by {plan.planner === 'llm' ? `the AI (${plan.plannerModel || 'Gemini'})` : 'fixed rules'}
          </span>
        </span>
        <ChevronDown className={`h-5 w-5 shrink-0 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && (
        <ol className="space-y-2.5 border-t border-line px-5 py-4 text-[13px] leading-relaxed">
          {plan.trace.map((t) => (
            <li key={t.step} className="grid grid-cols-[5.5rem_1fr] gap-3">
              <span
                className={`h-fit rounded-md px-1.5 py-0.5 text-center text-[11px] font-medium ${
                  t.type === 'tool_call' ? 'bg-b-soft text-b-ink' : t.type === 'tool_result' ? 'bg-paper text-ink' : t.type === 'guardrail' ? 'bg-shared-soft text-shared-ink' : 'bg-a-soft text-a-ink'
                }`}
              >
                {t.type === 'tool_call' ? 'Qloo call' : t.type === 'tool_result' ? 'Result' : t.type === 'guardrail' ? 'Check' : t.type === 'synthesis' ? 'Plan' : 'Agent'}
              </span>
              <span className="min-w-0 break-words">
                <span className="font-medium">{t.action}.</span> <span className="text-muted">{t.details}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Limits() {
  return (
    <section className="rounded-3xl border border-line bg-card p-5 text-sm leading-relaxed sm:p-6" aria-labelledby="limits-title">
      <h2 id="limits-title" className="text-lg font-semibold">
        What this can and can’t tell you
      </h2>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
        <li>Every pick comes from Qloo. The AI only chooses among Qloo’s results and writes the short notes; it can’t add titles.</li>
        <li>Ranks compare tonight’s candidates using what people with similar favourites tend to like. They’re a strong hint, not a promise you’ll both enjoy it.</li>
        <li>Film runtimes are checked against your time. TV picks are one episode or more.</li>
        <li>Your reactions shape the next plan in this browser tab only. Nothing is saved to an account.</li>
        <li>Your names never go to Qloo or the AI. Your favourites go to Qloo and, for planning, to Google’s Gemini.</li>
        <li>Streaming availability isn’t checked; the links search for a trailer or the artist.</li>
      </ul>
    </section>
  );
}

export function PlanView({
  session,
  busy,
  onFeedback,
  onReset
}: {
  session: Session;
  busy: boolean;
  onFeedback: (v: Record<string, Verdict>) => void;
  onReset: () => void;
}) {
  const plan = session.plans[0];
  const [A, B] = session.people;
  const names: [string, string] = [A.name, B.name];
  const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({});
  const [rating, setRating] = useState(false);
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
  const unmatched = session.people.flatMap((p) => p.favourites.filter((f) => f.unmatched).map((f) => `${f.query} (${p.name})`));
  const block = (p: Pick, hero = false) => <PickBlock key={p.id} pick={p} verdict={verdicts[p.id]} setVerdict={set(p.id)} names={names} hero={hero} rate={rating} />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 pt-2 text-sm">
        <p className="text-muted">
          Night {plan.number}
          {plan.number > 1 ? ', shaped by your reactions' : ''}, {minutesLabel(plan.minutes)} at home
        </p>
        <button type="button" onClick={onReset} className="min-h-[44px] shrink-0 px-2 font-medium text-muted underline-offset-2 hover:text-ink hover:underline">
          Start over
        </button>
      </div>

      {(plan.notices.length > 0 || unmatched.length > 0) && (
        <div className="space-y-1 rounded-2xl border border-line bg-card px-4 py-3 text-sm" role="status">
          {plan.notices.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
          {unmatched.length > 0 && <p>Qloo couldn’t find {unmatched.join(', ')}, so we left {unmatched.length === 1 ? 'it' : 'them'} out. Try the full name next time.</p>}
        </div>
      )}

      {session.feedback.length > 0 && <Learning session={session} />}

      <Venn session={session} plan={plan} />

      {picks.length > 0 && (
        <section className="px-1">
          <h2 className="text-lg font-semibold">Tonight</h2>
          <p className="mt-1 text-[17px] leading-relaxed">{plan.tonight}</p>
        </section>
      )}

      {plan.watch && (
        <section className="rounded-3xl border border-line bg-card p-5 sm:p-6" aria-labelledby="watch-title">
          <h2 id="watch-title" className="mb-4 text-lg font-semibold">
            Watch together
          </h2>
          {block(plan.watch, true)}
          {plan.alsoWatch.length > 0 && (
            <div className="mt-6 space-y-6 border-t border-line pt-5">
              <h3 className="text-base font-semibold">Or instead</h3>
              {plan.alsoWatch.map((p) => block(p))}
            </div>
          )}
        </section>
      )}

      {plan.listen.length > 0 && (
        <section className="rounded-3xl border border-line bg-card p-5 sm:p-6" aria-labelledby="listen-title">
          <h2 id="listen-title" className="mb-4 text-lg font-semibold">
            Music for the evening
          </h2>
          <div className="space-y-6">{plan.listen.map((p) => block(p))}</div>
        </section>
      )}

      {(plan.swap.forA || plan.swap.forB) && (
        <section aria-labelledby="swap-title">
          <h2 id="swap-title" className="mb-3 px-1 text-lg font-semibold">
            Swap a favourite
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { p: plan.swap.forA, to: A.name, from: B.name, edge: 'border-l-a' },
              { p: plan.swap.forB, to: B.name, from: A.name, edge: 'border-l-b' }
            ].map(({ p, to, from, edge }) =>
              p ? (
                <div key={p.id} className={`rounded-3xl border border-l-4 border-line bg-card p-5 ${edge}`}>
                  <p className="mb-3 text-sm font-medium">
                    {to}, try this from {from}’s world
                  </p>
                  {block(p)}
                </div>
              ) : null
            )}
          </div>
        </section>
      )}

      {plan.why.length > 0 && picks.length > 0 && (
        <section className="px-1 text-[15px]">
          <h2 className="text-lg font-semibold">Why this plan</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
            {plan.why.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      )}

      {picks.length > 0 && (
        <section className="sticky bottom-3 z-10 rounded-3xl border border-line bg-card/95 p-4 shadow-[0_8px_30px_rgba(29,26,43,0.12)] backdrop-blur">
          {!rating ? (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-sm text-muted">After your night, tell us who liked what. The next plan learns from it.</p>
              <button type="button" onClick={() => setRating(true)} className="btn-primary w-full sm:w-auto">
                Rate tonight
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <p className="text-sm text-muted" aria-live="polite">
                {rated ? `${rated} of ${picks.length} rated. Skip anything you didn’t try.` : 'Tap who liked each one above. Skip anything you didn’t try.'}
              </p>
              <button type="button" disabled={!rated || busy} onClick={() => onFeedback(verdicts)} className="btn-primary w-full sm:w-auto">
                <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} aria-hidden />
                {busy ? 'Planning your next night…' : 'Plan our next night'}
              </button>
            </div>
          )}
        </section>
      )}

      <Trace plan={plan} />
      <Limits />
    </div>
  );
}
