'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import type { PairView } from './pair';

const QUICK = ['🍿 Starting now?', '😂', '😍', 'Pause!', 'Next one?', '❤️'];

/**
 * A small chat beside the plan, for the two people in a pair, like a message thread. Messages live
 * on the server for 48 hours with the pair, then go.
 */
export function Chat({ view, me, send }: { view: PairView; me: 'a' | 'b'; send: (a: Record<string, unknown>) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [readUpTo, setReadUpTo] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const them = view.names[me === 'a' ? 1 : 0];
  const other = me === 'a' ? 'b' : 'a';
  const unread = view.messages.filter((m) => m.who !== me && m.at > readUpTo).length;

  useEffect(() => {
    try {
      setReadUpTo(Number(sessionStorage.getItem(`cg-chat-read:${view.id}`)) || 0);
    } catch {
      /* ignore */
    }
  }, [view.id]);

  useEffect(() => {
    if (!open) return;
    const last = view.messages[view.messages.length - 1]?.at || 0;
    setReadUpTo(last);
    try {
      sessionStorage.setItem(`cg-chat-read:${view.id}`, String(last));
    } catch {
      /* ignore */
    }
    requestAnimationFrame(() => list.current?.scrollTo({ top: list.current.scrollHeight }));
  }, [open, view.messages, view.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const post = async (t: string) => {
    const msg = t.trim();
    if (!msg || sending) return;
    setSending(true);
    setError(null);
    try {
      await send({ type: 'message', text: msg });
      setText('');
      input.current?.focus();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const time = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[11.5rem] right-4 z-30 flex h-12 items-center gap-2 rounded-full bg-shared px-4 font-semibold text-white shadow-lg hover:bg-shared-ink sm:bottom-32"
        aria-label={`Chat with ${them}${unread ? `, ${unread} new` : ''}`}
      >
        <MessageCircle className="h-5 w-5" aria-hidden />
        <span className="text-sm">Chat</span>
        {unread > 0 && <span className="flex h-6 min-w-[24px] items-center justify-center rounded-full bg-a px-1.5 text-xs">{unread}</span>}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Chat with ${them}`}
            className="flex h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-card shadow-2xl sm:h-[640px] sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-line px-5 py-3">
              <div>
                <p className="font-display text-lg font-semibold">{them}</p>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <span className={`h-2 w-2 rounded-full ${view.online[other] ? 'bg-emerald-500' : 'bg-line'}`} aria-hidden />
                  {view.online[other] ? 'Here now' : 'Not here right now'}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-paper">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </header>

            <div ref={list} className="flex-1 space-y-1.5 overflow-y-auto bg-paper px-4 py-4" aria-live="polite">
              {!view.messages.length && (
                <p className="mx-auto mt-10 max-w-[16rem] text-center text-sm text-muted">Say hi to {them}. Plan what to start first, or tell them when you press play.</p>
              )}
              {view.messages.map((m, i) => {
                const mine = m.who === me;
                const prev = view.messages[i - 1];
                const gap = !prev || prev.who !== m.who || m.at - prev.at > 5 * 60_000;
                return (
                  <div key={m.id} className={`flex flex-col ${mine ? 'items-end' : 'items-start'} ${gap ? 'pt-2' : ''}`}>
                    <p
                      className={`max-w-[78%] whitespace-pre-wrap break-words rounded-3xl px-4 py-2 text-[15px] leading-snug ${
                        mine ? `${me === 'a' ? 'bg-a' : 'bg-b'} rounded-br-lg text-white` : 'rounded-bl-lg bg-card text-ink shadow-sm'
                      }`}
                    >
                      {m.text}
                    </p>
                    {gap && <span className="mt-0.5 px-2 text-[11px] text-muted">{time(m.at)}</span>}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-line bg-card p-3">
              <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {QUICK.map((q) => (
                  <button key={q} type="button" onClick={() => post(q)} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm hover:border-ink/30">
                    {q}
                  </button>
                ))}
              </div>
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  post(text);
                }}
              >
                <input
                  ref={input}
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, 500))}
                  placeholder={`Message ${them}`}
                  aria-label={`Message ${them}`}
                  className="field min-w-0 flex-1 rounded-full"
                  autoFocus
                  enterKeyHint="send"
                />
                <button type="submit" disabled={!text.trim() || sending} aria-label="Send" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-shared text-white disabled:opacity-40">
                  <Send className="h-5 w-5" aria-hidden />
                </button>
              </form>
              {error && (
                <p className="mt-1 text-xs text-danger" role="alert">
                  {error}
                </p>
              )}
              <p className="mt-1.5 text-[11px] text-muted">Anyone with your link can read this chat, so keep the link between you two. It’s deleted after 48 hours.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
