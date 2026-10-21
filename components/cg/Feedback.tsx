'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageCircleHeart, X } from 'lucide-react';
import type { Session } from '../../lib/cg/types';

const DONE_KEY = 'cg-app-feedback-done-v1';
const LATER_KEY = 'cg-app-feedback-later-v1';

const safe = {
  get(store: 'local' | 'session', k: string) {
    try {
      return (store === 'local' ? localStorage : sessionStorage).getItem(k);
    } catch {
      return null;
    }
  },
  set(store: 'local' | 'session', k: string, v: string) {
    try {
      (store === 'local' ? localStorage : sessionStorage).setItem(k, v);
    } catch {
      /* private mode */
    }
  }
};

const EASE = [
  { v: 1, e: '😩', label: 'Painful' },
  { v: 2, e: '😕', label: 'Tricky' },
  { v: 3, e: '😐', label: 'OK' },
  { v: 4, e: '🙂', label: 'Easy' },
  { v: 5, e: '🤩', label: 'So easy' }
];
const FIT = [
  { v: 'both', e: '🎯', label: 'Spot on for both of us' },
  { v: 'one', e: '⚖️', label: 'Good for one of us' },
  { v: 'neither', e: '🙈', label: 'Missed for both' }
] as const;
const PARTS = [
  { v: 'proof', e: '📊', label: 'The ranks for each of us' },
  { v: 'mzansi', e: '🌍', label: 'Mzansi match' },
  { v: 'stories', e: '📱', label: 'Story cards' },
  { v: 'room', e: '💞', label: 'Swipe room' },
  { v: 'swaps', e: '🔁', label: 'The swaps' },
  { v: 'links', e: '▶️', label: 'Where to watch' }
] as const;
const AGAIN = [
  { v: 'yes', e: '🙌', label: 'Yes, for sure' },
  { v: 'maybe', e: '🤔', label: 'Maybe' },
  { v: 'no', e: '👋', label: 'Probably not' }
] as const;

type Answers = { ease?: number; fit?: string; liked: string[]; again?: string; comment: string };

/**
 * A 30-second, tap-only check-in for testers. One question per screen, big emoji answers that move
 * on by themselves, and an optional note at the end. Asks once; "Later" waits until next visit.
 */
export function FeedbackPrompt({ session }: { session: Session }) {
  const plan = session.plans[0];
  const [toast, setToast] = useState(false);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(true);

  useEffect(() => {
    const isDone = safe.get('local', DONE_KEY) === '1';
    setDone(isDone);
    if (isDone || safe.get('session', LATER_KEY) === '1') return;
    // A gentle nudge: after a good look at the first plan, or soon after a second night.
    const t = setTimeout(() => setToast(true), (plan?.number || 1) >= 2 ? 2500 : 35000);
    return () => clearTimeout(t);
  }, [plan?.number]);

  const later = () => {
    setToast(false);
    safe.set('session', LATER_KEY, '1');
  };

  return (
    <>
      {toast && !open && (
        <div className="fixed inset-x-0 top-3 z-40 flex justify-center px-4" role="dialog" aria-label="Quick feedback">
          <div className="cg-pop flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink p-3 pl-4 text-white shadow-xl">
            <span className="text-2xl" aria-hidden>
              💬
            </span>
            <p className="flex-1 text-sm leading-snug">
              <span className="font-semibold">Got 30 seconds?</span> Five taps to tell us how this went.
            </p>
            <button type="button" onClick={() => setOpen(true)} className="min-h-[40px] rounded-full bg-white px-4 text-sm font-semibold text-ink">
              Sure
            </button>
            <button type="button" onClick={later} aria-label="Later" className="flex h-10 w-10 items-center justify-center rounded-full text-white/70 hover:text-white">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto flex min-h-[44px] items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-medium text-ink hover:border-ink/30"
      >
        <MessageCircleHeart className="h-4 w-4 text-a" aria-hidden /> {done ? 'Tell us more about Common Ground' : 'Rate Common Ground (30 seconds)'}
      </button>
      {open && (
        <Sheet
          session={session}
          onClose={(sent) => {
            setOpen(false);
            setToast(false);
            if (sent) {
              safe.set('local', DONE_KEY, '1');
              setDone(true);
            } else safe.set('session', LATER_KEY, '1');
          }}
        />
      )}
    </>
  );
}

function Sheet({ session, onClose }: { session: Session; onClose: (sent: boolean) => void }) {
  const [step, setStep] = useState(0);
  const [a, setA] = useState<Answers>({ liked: [], comment: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const [A, B] = session.people;
  const steps = 5;

  useEffect(() => {
    box.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose(state === 'sent');
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, state]);

  // Tap an answer and it moves on by itself, with a beat so the choice registers.
  const pick = (patch: Partial<Answers>) => {
    setA((cur) => ({ ...cur, ...patch }));
    setTimeout(() => setStep((s) => Math.min(steps - 1, s + 1)), 260);
  };

  const send = async () => {
    setState('sending');
    setError('');
    try {
      const plan = session.plans[0];
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...a,
          comment: a.comment.trim() || undefined,
          context: {
            planNumber: plan?.number,
            sample: !!session.isSample,
            planner: plan?.planner,
            mobile: typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches,
            page: 'plan'
          }
        })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'That didn’t send. Try again?');
      setState('sent');
    } catch (e: any) {
      setState('error');
      setError(e.message);
    }
  };

  const Choice = ({ selected, onClick, e, label, wide }: { selected: boolean; onClick: () => void; e: string; label: string; wide?: boolean }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex items-center gap-3 rounded-2xl border-2 text-left transition active:scale-95 ${wide ? 'min-h-[56px] w-full px-4' : 'flex-col justify-center px-1 py-3'} ${
        selected ? 'border-shared bg-shared-soft' : 'border-line bg-card hover:border-ink/20'
      }`}
    >
      <span className={wide ? 'text-2xl' : 'text-3xl'} aria-hidden>
        {e}
      </span>
      <span className={`font-medium ${wide ? 'text-[15px]' : 'text-[12px] text-muted'}`}>{label}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => onClose(state === 'sent')}>
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Rate Common Ground"
        className="cg-pop w-full max-w-md rounded-t-3xl bg-paper p-5 pb-8 shadow-2xl outline-none sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          {step > 0 && state !== 'sent' ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-card">
              <ArrowLeft className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <span className="h-10 w-10" />
          )}
          {state !== 'sent' && (
            <div className="flex gap-1.5" aria-label={`Question ${step + 1} of ${steps}`}>
              {Array.from({ length: steps }, (_, i) => (
                <span key={i} className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-shared' : i < step ? 'w-1.5 bg-shared/60' : 'w-1.5 bg-line'}`} />
              ))}
            </div>
          )}
          <button type="button" onClick={() => onClose(state === 'sent')} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-card">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {state === 'sent' ? (
          <div className="py-8 text-center">
            <p className="cg-pop text-6xl" aria-hidden>
              🎉
            </p>
            <p className="mt-4 font-display text-2xl font-semibold">Thank you!</p>
            <p className="mt-2 text-muted">That genuinely helps. Enjoy your night, {A.name} and {B.name}.</p>
            <button type="button" onClick={() => onClose(true)} className="btn-primary mt-6 w-full">
              Back to our plan
            </button>
          </div>
        ) : (
          <div className="mt-4 min-h-[300px]" key={step}>
            {step === 0 && (
              <>
                <h2 className="font-display text-2xl font-semibold leading-tight">How easy was it to get a plan?</h2>
                <div className="mt-5 grid grid-cols-5 gap-2">
                  {EASE.map((o) => (
                    <Choice key={o.v} selected={a.ease === o.v} onClick={() => pick({ ease: o.v })} e={o.e} label={o.label} />
                  ))}
                </div>
              </>
            )}
            {step === 1 && (
              <>
                <h2 className="font-display text-2xl font-semibold leading-tight">Did tonight’s picks feel right for both of you?</h2>
                <div className="mt-5 space-y-2">
                  {FIT.map((o) => (
                    <Choice key={o.v} wide selected={a.fit === o.v} onClick={() => pick({ fit: o.v })} e={o.e} label={o.label} />
                  ))}
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <h2 className="font-display text-2xl font-semibold leading-tight">What did you like most?</h2>
                <p className="mt-1 text-sm text-muted">Tap any that apply.</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {PARTS.map((o) => (
                    <Choice
                      key={o.v}
                      wide
                      selected={a.liked.includes(o.v)}
                      onClick={() => setA((cur) => ({ ...cur, liked: cur.liked.includes(o.v) ? cur.liked.filter((x) => x !== o.v) : [...cur.liked.filter((x) => x !== 'none'), o.v] }))}
                      e={o.e}
                      label={o.label}
                    />
                  ))}
                </div>
                <button type="button" onClick={() => setStep(3)} className="btn-primary mt-5 w-full">
                  {a.liked.length ? 'Next' : 'Skip'}
                </button>
              </>
            )}
            {step === 3 && (
              <>
                <h2 className="font-display text-2xl font-semibold leading-tight">Would you use it again?</h2>
                <div className="mt-5 space-y-2">
                  {AGAIN.map((o) => (
                    <Choice key={o.v} wide selected={a.again === o.v} onClick={() => pick({ again: o.v })} e={o.e} label={o.label} />
                  ))}
                </div>
              </>
            )}
            {step === 4 && (
              <>
                <h2 className="font-display text-2xl font-semibold leading-tight">Anything confusing, or missing?</h2>
                <p className="mt-1 text-sm text-muted">Optional. Please don’t include anyone’s full name.</p>
                <textarea
                  value={a.comment}
                  onChange={(e) => setA((cur) => ({ ...cur, comment: e.target.value.slice(0, 600) }))}
                  rows={4}
                  placeholder="e.g. I didn’t get what the ranks meant…"
                  className="field mt-4 w-full resize-none"
                />
                {state === 'error' && (
                  <p className="mt-2 text-sm text-danger" role="alert">
                    {error}
                  </p>
                )}
                <button type="button" onClick={send} disabled={state === 'sending'} className="btn-primary mt-4 w-full">
                  {state === 'sending' ? 'Sending…' : 'Send'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
