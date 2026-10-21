'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PairView } from '../../lib/server/pairs';
import type { Session } from '../../lib/cg/types';

export type { PairView };

/** Keep this phone joined to its pair space: live updates by server-sent events, polling as a fallback. */
export function usePair(id: string | undefined, me: 'a' | 'b') {
  const [view, setView] = useState<PairView | null>(null);
  const [gone, setGone] = useState(false);
  const latest = useRef(0);

  const take = useCallback((v: PairView) => {
    if (v.version < latest.current) return;
    latest.current = v.version;
    setView(v);
  }, []);

  useEffect(() => {
    if (!id) return;
    latest.current = 0;
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let fails = 0;
    const fetchOnce = () =>
      fetch(`/api/pair/${id}`)
        .then(async (r) => {
          if (r.status === 404) return setGone(true);
          if (r.ok) take(await r.json());
        })
        .catch(() => {});
    fetchOnce();
    if (typeof EventSource !== 'undefined') {
      es = new EventSource(`/api/pair/${id}/events?p=${me}`);
      es.addEventListener('pair', (ev) => {
        fails = 0;
        take(JSON.parse((ev as MessageEvent).data));
      });
      es.onerror = () => {
        if (++fails >= 3 && !poll) poll = setInterval(fetchOnce, 4000);
      };
    } else poll = setInterval(fetchOnce, 4000);
    return () => {
      es?.close();
      if (poll) clearInterval(poll);
    };
  }, [id, me, take]);

  const send = useCallback(
    async (action: Record<string, unknown>) => {
      if (!id) return null;
      const res = await fetch(`/api/pair/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...action, who: me }) });
      const j = await res.json().catch(() => ({}));
      if (res.status === 404) setGone(true);
      if (!res.ok) throw new Error(j.error || 'That didn’t go through.');
      take(j);
      return j as PairView;
    },
    [id, me, take]
  );

  const fetchSession = useCallback(async (): Promise<Session | null> => {
    if (!id) return null;
    const res = await fetch(`/api/pair/${id}?session=1`);
    if (!res.ok) return null;
    const j = await res.json();
    return j.session || null;
  }, [id]);

  return { view, gone, send, fetchSession };
}

/** Share this phone's plan with the other phone. Quietly does nothing if there's no pair. */
export async function sharePlan(session: Session) {
  if (!session.pair) return;
  try {
    await fetch(`/api/pair/${session.pair.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'session', who: session.pair.me, session })
    });
  } catch {
    /* the other phone can still be sent the plan later */
  }
}

export async function pairPing(id: string, me: 'a' | 'b', type: 'hello' | 'planning', name?: string) {
  try {
    await fetch(`/api/pair/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, who: me, name }) });
  } catch {
    /* best effort */
  }
}
