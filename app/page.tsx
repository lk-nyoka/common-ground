'use client';

import React, { useEffect, useState } from 'react';
import type { Session, Verdict } from '../lib/cg/types';
import { applyFeedback } from '../lib/cg/learn';
import { Setup } from '../components/cg/Setup';
import { PlanView } from '../components/cg/PlanView';

const KEY = 'common-ground-session-v1';

interface Status {
  qloo: { keySet: boolean; savedResponses: number };
  llm: { configured: boolean; model: string | null };
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {
      /* storage unavailable */
    }
    fetch('/api/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    try {
      if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
      else sessionStorage.removeItem(KEY);
    } catch {
      /* storage unavailable */
    }
  }, [session]);

  const call = async (url: string, body: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.session) throw new Error(data.error || `The planner answered HTTP ${res.status}.`);
      setSession(data.session);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  };

  const start = (s: Session) => {
    setSession(s);
    call('/api/cg/plan', { session: s });
  };
  const feedback = (verdicts: Record<string, Verdict>) => {
    if (!session) return;
    // Show the learning straight away; the server re-plans from the same update.
    setSession(applyFeedback(session, verdicts));
    call('/api/cg/feedback', { session, verdicts });
  };

  const qloo = status ? (status.qloo.keySet ? 'Qloo live' : status.qloo.savedResponses ? 'Qloo saved' : 'Qloo not connected') : '';
  const agent = status?.llm.configured ? 'Gemini agent' : status ? 'Rules only' : '';
  const hasPlan = !!session?.plans.length;

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
        <button type="button" onClick={() => !busy && setSession(null)} className="flex items-center gap-2" aria-label="Common Ground home">
          <span className="relative h-6 w-9" aria-hidden>
            <span className="absolute left-0 top-0 h-6 w-6 rounded-full bg-personA/90 mix-blend-multiply" />
            <span className="absolute right-0 top-0 h-6 w-6 rounded-full bg-personB/90 mix-blend-multiply" />
          </span>
          <span className="font-display text-lg">Common Ground</span>
        </button>
        {status && (
          <span className="rounded-full border border-line bg-card px-2.5 py-1 text-[11px] text-muted" title="What this deployment is connected to">
            <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${status.qloo.keySet ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            {qloo} · {agent}
          </span>
        )}
      </header>

      <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        {error && (
          <div className="mb-4 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm">
            {error}{' '}
            {session && (
              <button type="button" className="underline" onClick={() => call(hasPlan ? '/api/cg/plan' : '/api/cg/plan', { session })}>
                Try again
              </button>
            )}
          </div>
        )}

        {busy && !hasPlan ? (
          <div className="flex flex-col items-center py-24 text-center">
            <span className="relative mb-6 h-12 w-20" aria-hidden>
              <span className="absolute left-0 top-0 h-12 w-12 animate-pulse rounded-full bg-personA/80 mix-blend-multiply" />
              <span className="absolute right-0 top-0 h-12 w-12 animate-pulse rounded-full bg-personB/80 mix-blend-multiply [animation-delay:300ms]" />
            </span>
            <p className="font-display text-2xl">Looking for your common ground…</p>
            <p className="mt-2 max-w-sm text-sm text-muted">Matching favourites in Qloo, comparing your tastes, then planning the night. Usually 10–30 seconds.</p>
          </div>
        ) : hasPlan && session ? (
          <PlanView key={session.plans[0].id} session={session} busy={busy} onFeedback={feedback} onReset={() => setSession(null)} />
        ) : (
          <Setup onStart={start} busy={busy} />
        )}

        <footer className="mt-16 border-t border-line pt-6 text-center text-xs text-muted">
          <p>
            Recommendations from <a className="underline" href="https://www.qloo.com" target="_blank" rel="noreferrer">Qloo</a>’s taste graph. Nothing is invented: every pick is a Qloo result, and the agent’s steps are shown with each plan.
          </p>
          <p className="mt-2">
            Visiting someone with dementia? Try <a className="underline" href="/gentle">Gentle visit</a>.
          </p>
        </footer>
      </div>
    </main>
  );
}
