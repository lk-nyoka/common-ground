'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentTraceStep } from '../lib/types';
import type { Session, Verdict } from '../lib/cg/types';
import { applyFeedback } from '../lib/cg/learn';
import { decodeInvite, type Invite } from '../lib/cg/invite';
import { Setup } from '../components/cg/Setup';
import { PlanView } from '../components/cg/PlanView';
import { Progress } from '../components/cg/Progress';
import { Mark } from '../components/cg/ui';
import { pairPing, sharePlan, usePair } from '../components/cg/pair';
import { Chat } from '../components/cg/Chat';

const PENDING = 'cg-pending-pair-v1';
type Pending = { id: string; them: string };

const KEY = 'common-ground-session-v2';
const TIMEOUT_MS = 75_000;

interface Status {
  qloo: { keySet: boolean; savedResponses: number };
  llm: { configured: boolean; model: string | null };
}

/**
 * POST and read the agent's steps as they stream in (newline-delimited JSON).
 * Falls back to a plain JSON body if the response isn't a stream.
 */
async function planRequest(url: string, body: unknown, onStep: (s: AgentTraceStep) => void, signal: AbortSignal): Promise<Session> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/x-ndjson' },
    body: JSON.stringify(body),
    signal
  });
  const type = res.headers.get('content-type') || '';
  if (!type.includes('ndjson') || !res.body) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.session) throw new Error(data.error || 'The planner had a problem. Please try again.');
    return data.session;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let session: Session | null = null;
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let msg: any;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }
      if (msg.type === 'step') onStep(msg.step);
      else if (msg.type === 'done') session = msg.session;
      else if (msg.type === 'error') throw new Error(msg.error);
    }
    if (done) break;
  }
  if (!session) throw new Error('The planner stopped before finishing. Please try again.');
  return session;
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [steps, setSteps] = useState<AgentTraceStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  // "Change favourites" keeps what you typed, so you can fix one thing and plan again.
  const [draftFrom, setDraftFrom] = useState<Session | null>(null);

  useEffect(() => {
    const inv = decodeInvite(window.location.hash);
    if (inv) {
      setInvite(inv);
      // Tell the inviter's phone their friend has opened the link.
      if (inv.pair) pairPing(inv.pair, 'b', 'hello', inv.toName || undefined);
    } else {
      try {
        const raw = sessionStorage.getItem(KEY);
        if (raw) setSession(JSON.parse(raw));
        const p = sessionStorage.getItem(PENDING);
        if (p && !raw) setPending(JSON.parse(p));
      } catch {
        /* storage unavailable */
      }
    }
    setLoaded(true);
    const onHash = () => {
      const next = decodeInvite(window.location.hash);
      if (next) {
        setSession(null);
        setInvite(next);
      }
    };
    window.addEventListener('hashchange', onHash);
    fetch('/api/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
      else sessionStorage.removeItem(KEY);
    } catch {
      /* storage unavailable or full */
    }
  }, [session, loaded]);

  const call = useCallback(async (url: string, body: unknown) => {
    setBusy(true);
    setError(null);
    setSteps([]);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const next = await planRequest(url, body, (s) => setSteps((cur) => [...cur, s]), controller.signal);
      setSession(next);
      // If two phones are joined, the other one gets this plan too.
      sharePlan(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(
        err?.name === 'AbortError'
          ? 'That took too long. Qloo or the AI planner may be busy. Please try again.'
          : typeof navigator !== 'undefined' && !navigator.onLine
          ? 'You seem to be offline. Check your connection and try again.'
          : String(err?.message || 'Something went wrong. Please try again.')
      );
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }, []);

  const start = (s: Session) => {
    if (invite) {
      // The invite has done its job; drop it from the address bar so a refresh doesn't restart it.
      history.replaceState(null, '', window.location.pathname);
      if (invite.pair) {
        s = { ...s, pair: { id: invite.pair, me: 'b' } };
        pairPing(invite.pair, 'b', 'planning', s.people[1].name);
      }
      setInvite(null);
    }
    setSession(s);
    call('/api/cg/plan', { session: s });
  };
  const feedback = (verdicts: Record<string, Verdict>) => {
    if (!session) return;
    // Show the learning straight away; the server re-plans from the same update.
    setSession(applyFeedback(session, verdicts));
    call('/api/cg/feedback', { session, verdicts });
  };
  const reset = () => {
    if (busy) return;
    setDraftFrom(session && !session.isSample ? session : null);
    setSession(null);
    setError(null);
    clearPending();
  };
  const clearPending = () => {
    setPending(null);
    try {
      sessionStorage.removeItem(PENDING);
    } catch {
      /* ignore */
    }
  };
  const invited = (id: string, them: string) => {
    const p = { id, them };
    setPending(p);
    try {
      sessionStorage.setItem(PENDING, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  };
  /** The other phone made or changed the plan: show it here too. */
  const received = useCallback((shared: Session, pair: { id: string; me: 'a' | 'b' }) => {
    setSession({ ...shared, pair });
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const hasPlan = !!session?.plans.length;
  const chip = status
    ? [status.qloo.keySet ? 'Live Qloo data' : status.qloo.savedResponses ? 'Saved Qloo data' : 'Qloo not connected', status.llm.configured ? 'AI planner on' : 'Rules only']
    : null;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-card focus:px-4 focus:py-2">
        Skip to content
      </a>
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <button type="button" onClick={reset} className="flex min-h-[44px] items-center gap-2" aria-label="Common Ground, start over">
          <Mark size={22} />
          <span className="font-display text-lg font-semibold">Common Ground</span>
        </button>
        {chip && (
          <p className="flex items-center gap-1.5 text-right text-xs text-muted" title="What this site is connected to">
            <span className={`inline-block h-2 w-2 rounded-full ${status!.qloo.keySet ? 'bg-emerald-600' : 'bg-amber-500'}`} aria-hidden />
            <span>
              {chip[0]}
              <span className="hidden sm:inline">, {chip[1].replace('AI planner on', 'AI planner on').replace('Rules only', 'rules only')}</span>
            </span>
          </p>
        )}
      </header>

      <div id="content" className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        {error && (
          <div role="alert" className="mb-5 rounded-2xl border border-danger/30 bg-card px-4 py-3 text-sm">
            <p>{error}</p>
            {session && !busy && (
              <button type="button" className="mt-2 min-h-[40px] font-semibold text-shared-ink underline underline-offset-2" onClick={() => call('/api/cg/plan', { session })}>
                Try again
              </button>
            )}
          </div>
        )}

        {!loaded ? null : busy && !hasPlan ? (
          <Progress steps={steps} />
        ) : hasPlan && session ? (
          <>
            {busy && (
              <div className="mb-4 rounded-2xl border border-shared/30 bg-shared-soft px-4 py-3 text-sm text-shared-ink" role="status" aria-live="polite">
                Planning your next night… {steps.length ? `(${steps.length} steps so far)` : ''}
              </div>
            )}
            <PlanView key={session.plans[0].id} session={session} busy={busy} onFeedback={feedback} onReset={reset} />
            {session.pair && <PairBridge session={session} onReceived={received} />}
          </>
        ) : (
          <>
            {pending && !invite && <Waiting pending={pending} onReceived={(s) => { received(s, { id: pending.id, me: 'a' }); clearPending(); }} onCancel={clearPending} />}
            <Setup key={invite ? 'invite' : 'setup'} onStart={start} busy={busy} initial={session ?? draftFrom} invite={invite} onInviteSent={invited} />
          </>
        )}

        <footer className="mt-16 space-y-2 border-t border-line pt-6 text-sm text-muted">
          <p>
            Recommendations come from{' '}
            <a className="underline underline-offset-2" href="https://www.qloo.com" target="_blank" rel="noreferrer">
              Qloo
            </a>
            ’s taste graph. Every pick is a Qloo result, and each plan shows the agent’s steps.
          </p>
          <p>
            Planning a visit to someone living with dementia?{' '}
            <a className="underline underline-offset-2" href="/gentle">
              Try Gentle visit
            </a>{' '}
            (experimental).
          </p>
          <p>
            <a className="underline underline-offset-2" href="https://github.com/lk-nyoka/common-ground" target="_blank" rel="noreferrer">
              Source code
            </a>{' '}
            under the MIT licence.
          </p>
        </footer>
      </div>
    </main>
  );
}

/** Keeps a shared plan in step between the two phones, and adds the chat. */
function PairBridge({ session, onReceived }: { session: Session; onReceived: (s: Session, pair: { id: string; me: 'a' | 'b' }) => void }) {
  const pair = session.pair!;
  const { view, send, fetchSession } = usePair(pair.id, pair.me);
  const seen = useRef<number | null>(null);
  useEffect(() => {
    if (!view) return;
    if (seen.current === null) {
      seen.current = view.sessionVersion;
      return;
    }
    if (view.sessionVersion > seen.current) {
      seen.current = view.sessionVersion;
      if (view.sessionBy !== pair.me) fetchSession().then((s) => s && onReceived(s, pair));
    }
  }, [view, pair, fetchSession, onReceived]);
  if (!view) return null;
  return <Chat view={view} me={pair.me} send={send} />;
}

/** The inviter's screen while their friend fills in the link. */
function Waiting({ pending, onReceived, onCancel }: { pending: Pending; onReceived: (s: Session) => void; onCancel: () => void }) {
  const { view, gone, fetchSession } = usePair(pending.id, 'a');
  const them = view?.names[1] && view.names[1] !== 'Them' ? view.names[1] : pending.them || 'Your friend';
  useEffect(() => {
    if (view && view.sessionVersion > 0) fetchSession().then((s) => s && onReceived(s));
  }, [view, fetchSession, onReceived]);
  const stage = gone ? 'gone' : view?.stage || 'waiting';
  const steps = [
    { k: 'waiting', label: 'Link sent' },
    { k: 'joined', label: `${them} opened it` },
    { k: 'planning', label: 'Planning your night' },
    { k: 'ready', label: 'Your plan' }
  ];
  const at = Math.max(0, steps.findIndex((x) => x.k === stage));
  return (
    <section className="mb-6 rounded-3xl border-2 border-b bg-b-soft p-5" aria-live="polite">
      {stage === 'gone' ? (
        <p className="text-sm">That link has expired. Make a new one below.</p>
      ) : (
        <>
          <p className="font-display text-xl font-semibold">
            {stage === 'waiting' ? `Waiting for ${them} to open your link` : stage === 'joined' ? `${them} is adding their favourites…` : `${them} is planning your night…`}
          </p>
          <p className="mt-1 text-sm text-muted">Keep this page open. Your plan opens here by itself as soon as it’s ready, and you can chat beside it.</p>
          <ol className="mt-4 grid grid-cols-4 gap-1.5">
            {steps.map((x, i) => (
              <li key={x.k} className="text-center text-[11px] text-muted">
                <span className={`mb-1 block h-1.5 rounded-full ${i <= at ? 'bg-b' : 'bg-white'} ${i === at + 1 ? 'animate-pulse bg-b/40' : ''}`} />
                {x.label}
              </li>
            ))}
          </ol>
        </>
      )}
      <button type="button" onClick={onCancel} className="mt-3 text-sm font-medium text-b-ink underline underline-offset-2">
        {stage === 'gone' ? 'Dismiss' : 'Stop waiting'}
      </button>
    </section>
  );
}
