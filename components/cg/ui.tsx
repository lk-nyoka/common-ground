'use client';

import React, { useState } from 'react';
import { Film, Music2, Tv } from 'lucide-react';

export function TypeIcon({ type, className = 'h-5 w-5' }: { type: string; className?: string }) {
  if (type.includes('artist')) return <Music2 className={className} aria-hidden />;
  if (type.includes('tv')) return <Tv className={className} aria-hidden />;
  return <Film className={className} aria-hidden />;
}

/** Artwork from Qloo, with a quiet placeholder if it is missing or fails to load. */
export function Art({ src, type, className, alt = '' }: { src?: string; type: string; className: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed)
    return (
      <div className={`flex items-center justify-center bg-paper text-muted ${className}`} aria-hidden={!alt}>
        <TypeIcon type={type} />
      </div>
    );
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

/** The two overlapping circles: the product's mark. */
export function Mark({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size * 1.45} height={size} viewBox="0 0 58 40" className={className} aria-hidden>
      <defs>
        <clipPath id="mark-a">
          <circle cx="20" cy="20" r="18" />
        </clipPath>
      </defs>
      <circle cx="20" cy="20" r="18" fill="#D6336C" />
      <circle cx="38" cy="20" r="18" fill="#2B63D9" />
      <circle cx="38" cy="20" r="18" fill="#6F42C1" clipPath="url(#mark-a)" />
    </svg>
  );
}

export function typeLabel(type: string) {
  return type.includes('artist') ? 'Music' : type.includes('tv') ? 'TV' : 'Film';
}

export function minutesLabel(m: number) {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
}
