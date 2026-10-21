'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ChevronDown, RefreshCw, X } from 'lucide-react';
import type { Pick, Plan, Session, Verdict } from '../../lib/cg/types';
import { picksOf, sharedHitRate, summarise } from '../../lib/cg/learn';
import { Venn } from './Venn';
import { FitProof } from './FitProof';
import { Art, Mark, minutesLabel, typeLabel } from './ui';
import { LinkRow, linksFor, Ratings, SpotifyPlayer } from './Links';
import { StoryViewer } from './Stories';
import { Sparkles, Users } from 'lucide-react';
import { roomItemsFrom } from '../../lib/cg/room-items';
import { FeedbackPrompt } from './Feedback';
import { Spots } from './Spots';

function meta(p: Pick) {
  const bits: string[] = [p.kind === 'comedy' ? 'Comedian' : typeLabel(p.type)];
  if (p.year) bits.push(String(p.year));
  else if (p.activeFrom) bits.push(`since ${p.activeFrom}`);
  if (p.durationMinutes && !p.type.includes('artist')) bits.push(p.type.includes('tv') ? `${p.durationMinutes} min episodes` : minutesLabel(p.durationMinutes));
  if (p.contentRating) bits.push(p.contentRating);
  return bits.join(', ');
}

function VerdictButtons({ pick, value, onChange, names }: { pick: Pick; value?: Verdict; onChange: (v?: Verdict) => void; names: [string, string] }) {
  const opts: { v: Verdict; label: string; aria: string; on: string }[] = [
    { v: 'both', label: 'Both', aria: 'We both liked it', on: 'border-shared bg-shared text-white' },
    { v: 'a', label: names[0], aria: `Only ${names[0]} liked it`, on: 'border-a bg-a text-white' },
    { v: 'b', label: names[1], aria: `Only ${names[1]} liked it`, on: 'border-b bg-b text-white' },
    { v: 'neither', label: 'Neither', aria: 'Neither of us liked it', on: 'border-ink bg-ink text-white' }
  ];
  return (
    <fieldset className="mt-2">
      <legend className="sr-only">Who liked {pick.name}?</legend>
      <div className="grid grid-cols-4 gap-1.5">
        {opts.map((o) => (
          <button
            key={o.v}
            type="button"
            onClick={() => onChange(value === o.v ? undefined : o.v)}
            aria-pressed={value === o.v}
            aria-label={o.aria}
            className={`min-h-[40px] truncate rounded-full border px-2 text-[13px] transition ${
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
  rate,
  country
}: {
  pick: Pick;
  verdict?: Verdict;
  setVerdict: (v?: Verdict) => void;
  names: [string, string];
  hero?: boolean;
  rate: boolean;
  country: string;
}) {
  return (
    <article>
      <div className="flex gap-4">
        <Art src={pick.image} type={pick.type} className={hero ? 'h-32 w-[5.5rem] shrink-0 rounded-xl sm:h-56 sm:w-[9.5rem]' : 'h-16 w-16 shrink-0 rounded-xl'} />
        <div className="min-w-0 flex-1">
          <h3 className={hero ? 'text-2xl font-semibold leading-tight sm:text-3xl' : 'text-[17px] font-semibold leading-snug'}>{pick.name}</h3>
          <p className="mt-1 text-[13px] text-muted">
            {meta(pick)}
            {pick.local ? ', South African' : ''}
          </p>
          <Ratings pick={pick} />
        </div>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed">{pick.reason}</p>
      <FitProof pick={pick} names={names} compact peek={hero} />
      {pick.type.includes('artist') && <SpotifyPlayer spotifyId={pick.external?.spotifyId} name={pick.name} />}
      <LinkRow links={linksFor(pick, country)} scroll={hero} />
      {pick.provenance === 'qloo_saved' && (
        <p className="mt-2 text-[12px] text-muted" title={pick.capturedAt ? `Saved ${pick.capturedAt.slice(0, 10)}` : undefined}>
          From a saved Qloo response (Qloo was busy)
        </p>
      )}
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


/** A pick as one compact row: what it is, how it fits, one main action. Everything else is behind "More". */
function PickRow({ pick, names, country, label }: { pick: Pick; names: [string, string]; country: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const links = linksFor(pick, country);
  const main = links.find((l) => l.primary) || links[0];
  return (
    <li className="py-3 first:pt-0 last:pb-0">
      {label && <p className="mb-1.5 text-[13px] font-medium text-muted">{label}</p>}
      <div className="flex gap-3">
        <Art src={pick.image} type={pick.type} className="h-16 w-16 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-snug">{pick.name}</p>
          <p className="truncate text-[13px] text-muted">
            {meta(pick)}
            {pick.local ? ', South African' : ''}
          </p>
          <FitProof pick={pick} names={names} compact />
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-[4.75rem]">
        {main && (
          <a href={main.url} target="_blank" rel="noreferrer" className="inline-flex min-h-[36px] items-center gap-1 rounded-full bg-ink px-3 text-[13px] font-medium text-white">
            {main.label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </a>
        )}
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-line px-3 text-[13px] font-medium text-ink">
          {open ? 'Less' : 'More'} <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      </div>
      {open && (
        <div className="mt-2 pl-[4.75rem]">
          <Ratings pick={pick} />
          <p className="mt-2 text-[15px] leading-relaxed">{pick.reason}</p>
          {pick.type.includes('artist') && <SpotifyPlayer spotifyId={pick.external?.spotifyId} name={pick.name} />}
          <LinkRow links={links.filter((l) => l !== main)} />
        </div>
      )}
    </li>
  );
}

/** Rating as one sheet with every pick, instead of buttons under every card. */
function RateSheet({
  picks,
  names,
  verdicts,
  set,
  busy,
  onDone,
  onClose
}: {
  picks: Pick[];
  names: [string, string];
  verdicts: Record<string, Verdict>;
  set: (id: string) => (v?: Verdict) => void;
  busy: boolean;
  onDone: () => void;
  onClose: () => void;
}) {
  const rated = Object.keys(verdicts).length;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Rate tonight" className="flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl bg-card shadow-2xl sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-xl font-semibold">Who liked what?</h2>
            <p className="text-sm text-muted">Skip anything you didn’t try. The next plan learns from this.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full hover:bg-paper">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>
        <ul className="flex-1 divide-y divide-line overflow-y-auto px-5">
          {picks.map((p) => (
            <li key={p.id} className="py-3">
              <div className="flex items-center gap-3">
                <Art src={p.image} type={p.type} className="h-9 w-9 shrink-0 rounded-lg" />
                <p className="min-w-0 flex-1 truncate font-medium">{p.name}</p>
                <span className="shrink-0 text-xs text-muted">{typeLabel(p.type)}</span>
              </div>
              <VerdictButtons pick={p} value={verdicts[p.id]} onChange={set(p.id)} names={names} />
            </li>
          ))}
        </ul>
        <div className="border-t border-line p-4">
          <button type="button" disabled={!rated || busy} onClick={onDone} className="btn-primary w-full">
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} aria-hidden />
            {busy ? 'Planning your next night…' : rated ? `Plan our next night (${rated} rated)` : 'Tap at least one'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Where your tastes meet, as one line; the full overlap opens on tap. */
function CommonStrip({ session, plan }: { session: Session; plan: Plan }) {
  const [open, setOpen] = useState(false);
  const confirmed = plan.commonGround.filter((t) => t.confirmed);
  const shown = (confirmed.length ? confirmed : plan.commonGround).slice(0, 4);
  if (open)
    return (
      <div>
        <Venn session={session} plan={plan} />
        <button type="button" onClick={() => setOpen(false)} className="mt-1 min-h-[36px] px-1 text-sm font-medium text-shared-ink">
          Hide the overlap
        </button>
      </div>
    );
  return (
    <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left hover:border-ink/20" aria-expanded={false}>
      <Mark size={18} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] text-muted">Where your tastes meet</span>
        <span className="block truncate text-[15px] font-medium">{shown.length ? shown.map((t) => t.name).join(' · ') : 'See your overlap'}</span>
      </span>
      <ChevronDown className="h-4 w-4 shrink-0 text-muted" aria-hidden />
    </button>
  );
}

type Tab = 'also' | 'listen' | 'local' | 'swap' | 'comedy';

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
  const [story, setStory] = useState(false);
  const [roomBusy, setRoomBusy] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const openRoom = async () => {
    if (!plan) return;
    setRoomBusy(true);
    setRoomError(null);
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ names, items: roomItemsFrom(plan) })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.id) throw new Error(j.error || 'Couldn’t open a room. Try again.');
      window.location.href = `/room/${j.id}`;
    } catch (e: any) {
      setRoomError(e.message);
      setRoomBusy(false);
    }
  };
  const picks = useMemo(() => (plan ? picksOf(plan) : []), [plan]);
  const tabs = useMemo(() => {
    if (!plan) return [] as { k: Tab; label: string; n: number }[];
    return (
      [
        { k: 'listen' as Tab, label: 'Music', n: plan.listen.length },
        { k: 'local' as Tab, label: 'Mzansi', n: plan.local?.length || 0 },
        { k: 'comedy' as Tab, label: 'Comedy', n: plan.comedy?.length || 0 },
        { k: 'swap' as Tab, label: 'Swaps', n: [plan.swap.forA, plan.swap.forB].filter(Boolean).length },
        { k: 'also' as Tab, label: 'Films', n: plan.alsoWatch.length }
      ] as { k: Tab; label: string; n: number }[]
    ).filter((t) => t.n > 0);
  }, [plan]);
  const [tab, setTab] = useState<Tab | null>(null);
  const current = tab && tabs.some((t) => t.k === tab) ? tab : tabs[0]?.k;
  const set = (id: string) => (v?: Verdict) =>
    setVerdicts((cur) => {
      const next = { ...cur };
      if (v) next[id] = v;
      else delete next[id];
      return next;
    });
  if (!plan) return null;
  const country = session.country || 'za';
  const unmatched = session.people.flatMap((p) => p.favourites.filter((f) => f.unmatched).map((f) => `${f.query} (${p.name})`));

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-center justify-between gap-3 pt-1 text-sm">
        <p className="text-muted">
          Night {plan.number}
          {plan.number > 1 ? ', shaped by your reactions' : ''} · {minutesLabel(plan.minutes)} at home
        </p>
        <button type="button" onClick={onReset} className="min-h-[44px] shrink-0 px-2 font-medium text-muted underline-offset-2 hover:text-ink hover:underline">
          {session.isSample ? 'Start over' : 'Change favourites'}
        </button>
      </div>

      {session.isSample && (
        <div className="flex items-center justify-between gap-2 rounded-2xl bg-shared-soft px-4 py-2.5 text-sm text-shared-ink">
          <p>
            <span className="font-semibold">Example pair.</span> Real Qloo data.
          </p>
          <button type="button" onClick={onReset} className="min-h-[40px] shrink-0 rounded-full bg-shared px-4 font-semibold text-white">
            Make your own
          </button>
        </div>
      )}

      {(plan.notices.length > 0 || unmatched.length > 0) && (
        <div className="space-y-1 rounded-2xl border border-line bg-card px-4 py-3 text-sm" role="status">
          {plan.notices.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
          {unmatched.length > 0 && <p>Qloo couldn’t find {unmatched.join(', ')}, so we left {unmatched.length === 1 ? 'it' : 'them'} out. Try the full name next time.</p>}
        </div>
      )}

      {session.feedback.length > 0 && <Learning session={session} />}

      <CommonStrip session={session} plan={plan} />

      {plan.watch ? (
        <section className="rounded-3xl border border-line bg-card p-5" aria-labelledby="watch-title">
          <h2 id="watch-title" className="mb-1 text-sm font-semibold uppercase tracking-wider text-shared-ink">
            Tonight’s pick
          </h2>
          {(() => {
            const kinds = new Set(session.people.flatMap((p) => p.favourites.filter((f) => f.qlooEntityId).map((f) => f.type)));
            const musicOnly = kinds.size > 0 && Array.from(kinds).every((k) => k === 'urn:entity:artist');
            return musicOnly ? (
              <p className="mb-2 rounded-2xl bg-shared-soft px-3 py-2 text-[13px] leading-snug text-shared-ink">
                You both added music, so Qloo looked for a {plan.watch!.type.includes('tv') ? 'series' : 'film'} that fans of your music tend to love. The music picks are in the Music tab below.
              </p>
            ) : null;
          })()}
          <p className="mb-4 text-[15px] leading-relaxed text-muted">{plan.tonight}</p>
          <PickBlock pick={plan.watch} verdict={verdicts[plan.watch.id]} setVerdict={set(plan.watch.id)} names={names} hero rate={false} country={country} />
        </section>
      ) : (
        picks.length > 0 && <p className="px-1 text-[17px] leading-relaxed">{plan.tonight}</p>
      )}

      {picks.length > 1 && (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setStory(true)} className="flex min-h-[64px] items-center gap-3 rounded-2xl bg-ink px-4 text-left text-white hover:bg-ink/90">
            <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
            <span className="text-sm font-semibold leading-tight">
              Story cards
              <span className="block text-xs font-normal text-white/70">Share tonight</span>
            </span>
          </button>
          <button type="button" onClick={openRoom} disabled={roomBusy} className="flex min-h-[64px] items-center gap-3 rounded-2xl bg-shared px-4 text-left text-white hover:bg-shared-ink disabled:opacity-70">
            <Users className="h-5 w-5 shrink-0" aria-hidden />
            <span className="text-sm font-semibold leading-tight">
              {roomBusy ? 'Opening…' : 'Swipe together'}
              <span className="block text-xs font-normal text-white/80">Can’t decide?</span>
            </span>
          </button>
        </div>
      )}
      {roomError && (
        <p className="rounded-2xl bg-a-soft px-4 py-2 text-sm text-a-ink" role="alert">
          {roomError}
        </p>
      )}
      {story && <StoryViewer session={session} plan={plan} onClose={() => setStory(false)} />}

      {tabs.length > 0 && current && (
        <section className="rounded-3xl border border-line bg-card p-4" aria-label="The rest of tonight">
          <div className="-mx-1 mb-3 flex gap-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist">
            {tabs.map((t) => (
              <button
                key={t.k}
                type="button"
                role="tab"
                aria-selected={current === t.k}
                onClick={() => setTab(t.k)}
                className={`min-h-[40px] shrink-0 rounded-full px-4 text-sm font-medium transition ${current === t.k ? 'bg-ink text-white' : 'bg-paper text-muted hover:text-ink'}`}
              >
                {t.label} <span className={current === t.k ? 'text-white/70' : 'text-muted/70'}>{t.n}</span>
              </button>
            ))}
          </div>
          <div role="tabpanel">
            {current === 'comedy' && <p className="mb-3 text-[13px] text-muted">Stand-up comedians Qloo ranks for both of you. Catch a special tonight, or find their next live show.</p>}
            {current === 'local' && (
              <p className="mb-3 text-[13px] text-muted">South African artists Qloo found in your shared taste (music only: Qloo has no South African films or shows for this tag).</p>
            )}
            <ul className="divide-y divide-line">
              {current === 'listen' && plan.listen.map((p) => <PickRow key={p.id} pick={p} names={names} country={country} />)}
              {current === 'local' && plan.local.map((p) => <PickRow key={p.id} pick={p} names={names} country={country} />)}
              {current === 'comedy' && (plan.comedy || []).map((p) => <PickRow key={p.id} pick={p} names={names} country={country} />)}
              {current === 'also' && plan.alsoWatch.map((p) => <PickRow key={p.id} pick={p} names={names} country={country} />)}
              {current === 'swap' &&
                [
                  { p: plan.swap.forA, label: `${A.name}, try this from ${B.name}’s world` },
                  { p: plan.swap.forB, label: `${B.name}, try this from ${A.name}’s world` }
                ].map(({ p, label }) => (p ? <PickRow key={p.id} pick={p} names={names} country={country} label={label} /> : null))}
            </ul>
          </div>
        </section>
      )}

      {picks.length > 0 && <Spots session={session} />}

      {picks.length > 0 && (
        <section className="rounded-3xl border border-line bg-card">
          <button type="button" onClick={() => setDetails(!details)} aria-expanded={details} className="flex min-h-[56px] w-full items-center justify-between gap-3 px-5 text-left">
            <span>
              <span className="font-semibold">How this plan was made</span>
              <span className="block text-sm text-muted">Why these picks, every Qloo step, and what it can’t tell you</span>
            </span>
            <ChevronDown className={`h-5 w-5 shrink-0 transition ${details ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          {details && (
            <div className="space-y-4 border-t border-line p-4">
              {plan.why.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-[15px] text-muted">
                  {plan.why.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
              <Trace plan={plan} />
              <Limits />
            </div>
          )}
        </section>
      )}

      {picks.length > 0 && <FeedbackPrompt session={session} />}

      {picks.length > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card/95 px-4 py-3 backdrop-blur" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <p className="min-w-0 flex-1 text-[13px] leading-snug text-muted">After your night: who liked what? The next plan learns.</p>
            <button type="button" onClick={() => setRating(true)} disabled={busy} className="btn-primary shrink-0 px-5">
              {busy ? 'Planning…' : 'Rate tonight’s picks'}
            </button>
          </div>
        </div>
      )}
      {rating && (
        <RateSheet
          picks={picks}
          names={names}
          verdicts={verdicts}
          set={set}
          busy={busy}
          onClose={() => setRating(false)}
          onDone={() => {
            setRating(false);
            onFeedback(verdicts);
          }}
        />
      )}
    </div>
  );
}
