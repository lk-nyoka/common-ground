'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center text-ink">
      <h1 className="font-display text-3xl">Something went wrong.</h1>
      <p className="mt-2 max-w-sm text-muted">The page hit an error. Your plan is saved in this tab, so trying again usually works.</p>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={reset} className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white">
          Try again
        </button>
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.clear();
            } catch {
              /* ignore */
            }
            window.location.href = '/';
          }}
          className="rounded-full border border-line px-5 py-2.5 text-sm"
        >
          Start over
        </button>
      </div>
    </main>
  );
}
