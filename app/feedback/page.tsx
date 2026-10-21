'use client';

import React, { useEffect, useState } from 'react';

/** Owner-only summary of tester feedback: /feedback?key=YOUR_FEEDBACK_KEY */
export default function FeedbackResults() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const key = new URLSearchParams(window.location.search).get('key') || '';
    if (!key) {
      setError('no key');
      return;
    }
    fetch(`/api/feedback?${new URLSearchParams({ key })}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Not available.');
        setData(j);
      })
      .catch((e) => setError(e.message));
  }, []);
  const row = (title: string, obj: Record<string, number>) => (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-sm font-medium text-muted">{title}</p>
      <ul className="mt-2 space-y-1">
        {Object.entries(obj || {})
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => (
            <li key={k} className="flex justify-between">
              <span>{k}</span>
              <span className="font-semibold tabular-nums">{v}</span>
            </li>
          ))}
        {!Object.keys(obj || {}).length && <li className="text-muted">None yet</li>}
      </ul>
    </div>
  );
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold">Tester feedback</h1>
      {error && (
        <div className="mt-4 rounded-2xl border border-line bg-card p-5">
          <p className="font-medium">This page is for the app’s owner.</p>
          <p className="mt-1 text-sm text-muted">It needs an access key in the link. If you were testing the app, thank you: your feedback has been sent.</p>
          <a href="/" className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-ink px-5 text-sm font-medium text-white">
            Back to Common Ground
          </a>
        </div>
      )}
      {data && (
        <div className="mt-6 space-y-4">
          <p>
            <span className="font-display text-4xl font-semibold">{data.responses}</span> responses · mean ease{' '}
            <span className="font-semibold">{data.meanEase ?? 'n/a'}</span> / 5
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {row('Picks felt right', data.picks)}
            {row('Use again', data.again)}
            {row('Liked most', data.liked)}
          </div>
          <div className="rounded-2xl border border-line bg-card p-4">
            <p className="text-sm font-medium text-muted">Comments</p>
            <ul className="mt-2 space-y-3">
              {data.comments.map((c: any) => (
                <li key={c.at} className="border-b border-line pb-2 last:border-0">
                  <p>{c.comment}</p>
                  <p className="text-xs text-muted">{new Date(c.at).toLocaleString()}</p>
                </li>
              ))}
              {!data.comments.length && <li className="text-muted">None yet</li>}
            </ul>
          </div>
          <p className="text-xs text-muted">{data.note}</p>
        </div>
      )}
    </main>
  );
}
