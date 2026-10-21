'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bell, Share2 } from 'lucide-react';
import type { Session } from '../../lib/cg/types';
import { encodeProfile, profileFromPerson } from '../../lib/cg/drops-profile';

/** Taste drops are personal: each person opens their own, on their own phone. */
export function DropsEntry({ session }: { session: Session }) {
  const [shared, setShared] = useState(false);
  const [A, B] = session.people;
  const pa = profileFromPerson(A, session.includeLocal);
  const pb = profileFromPerson(B, session.includeLocal);
  if (!pa.signals.length && !pb.signals.length) return null;
  const linkB = () => `${window.location.origin}/drops#p=${encodeProfile(pb)}`;
  const share = async () => {
    const url = linkB();
    const text = `${B.name}, here are taste drops picked for you: one new thing a day to try, and it learns what you like. ${url}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Your taste drops', text, url });
      else {
        await navigator.clipboard.writeText(url);
        setShared(true);
      }
    } catch {
      /* cancelled */
    }
  };
  return (
    <section className="rounded-3xl border border-line bg-card p-5" aria-labelledby="drops-title">
      <h2 id="drops-title" className="flex items-center gap-2 text-lg font-semibold">
        <Bell className="h-5 w-5 text-a" aria-hidden /> Taste drops
      </h2>
      <p className="mt-1 text-sm text-muted">
        After tonight: one song, artist or film a day for each of you, chosen by a small model on your own phone that learns from what you actually try. Optional notifications.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {pa.signals.length > 0 && (
          <Link href={`/drops#p=${encodeProfile(pa)}`} className="inline-flex min-h-[44px] items-center rounded-full bg-a px-4 text-sm font-semibold text-white">
            {A.name}’s drops
          </Link>
        )}
        {pb.signals.length > 0 && (
          <>
            <Link href={`/drops#p=${encodeProfile(pb)}`} className="inline-flex min-h-[44px] items-center rounded-full bg-b px-4 text-sm font-semibold text-white">
              {B.name}’s drops
            </Link>
            <button type="button" onClick={share} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-line px-4 text-sm font-medium">
              <Share2 className="h-4 w-4" aria-hidden /> {shared ? 'Link copied' : `Send to ${B.name}`}
            </button>
          </>
        )}
      </div>
    </section>
  );
}
