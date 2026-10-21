'use client';

import React, { useState } from 'react';
import { ArrowUpRight, Play } from 'lucide-react';
import type { Pick } from '../../lib/cg/types';

const enc = encodeURIComponent;

export interface LinkOption {
  label: string;
  url: string;
  primary?: boolean;
}

/** Where to watch or listen, built from the ids Qloo provides. No availability is claimed that we can't check. */
export function linksFor(p: Pick, country: string): LinkOption[] {
  const ext = p.external || {};
  const out: LinkOption[] = [];
  if (p.type.includes('artist')) {
    if (ext.spotifyId) out.push({ label: 'Open in Spotify', url: `https://open.spotify.com/artist/${ext.spotifyId}`, primary: true });
    else out.push({ label: 'Find on Spotify', url: `https://open.spotify.com/search/${enc(p.name)}`, primary: true });
    out.push({ label: 'YouTube Music', url: `https://music.youtube.com/search?q=${enc(p.name)}` });
    return out;
  }
  if (ext.netflixId) out.push({ label: 'Open on Netflix', url: `https://www.netflix.com/title/${ext.netflixId}`, primary: true });
  out.push({
    label: country === 'za' ? 'Where to stream in South Africa' : 'Where to stream',
    url: `https://www.justwatch.com/${country}/search?q=${enc(p.name)}`,
    primary: !ext.netflixId
  });
  out.push({ label: 'Trailer', url: `https://www.youtube.com/results?search_query=${enc(`${p.name} ${p.year || ''} trailer`)}` });
  if (ext.imdbId) out.push({ label: 'IMDb', url: `https://www.imdb.com/title/${ext.imdbId}/` });
  return out;
}

export function Ratings({ pick }: { pick: Pick }) {
  const ext = pick.external || {};
  const bits: string[] = [];
  if (typeof ext.imdbRating === 'number' && ext.imdbRating > 0) bits.push(`IMDb ${ext.imdbRating.toFixed(1)}`);
  if (typeof ext.rottenTomatoes === 'number' && ext.rottenTomatoes > 0) bits.push(`Rotten Tomatoes ${Math.round(ext.rottenTomatoes)}%`);
  if (typeof ext.metacritic === 'number' && ext.metacritic > 0) bits.push(`Metacritic ${Math.round(ext.metacritic)}`);
  if (!bits.length) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Ratings">
      {bits.map((b) => (
        <li key={b} className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink">
          {b}
        </li>
      ))}
    </ul>
  );
}

export function LinkRow({ links }: { links: LinkOption[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {links.map((l) => (
        <a
          key={l.url}
          href={l.url}
          target="_blank"
          rel="noreferrer"
          className={`inline-flex min-h-[36px] items-center gap-1 rounded-full px-3 text-[13px] font-medium ${
            l.primary ? 'bg-ink text-white hover:bg-ink/85' : 'border border-line text-ink hover:border-ink/30'
          }`}
        >
          {l.label}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </a>
      ))}
    </div>
  );
}

/** Spotify's own player, loaded only when asked for, so a plan doesn't load a dozen players at once. */
export function SpotifyPlayer({ spotifyId, name }: { spotifyId?: string; name: string }) {
  const [open, setOpen] = useState(false);
  if (!spotifyId) return null;
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 inline-flex min-h-[40px] items-center gap-2 rounded-full bg-[#1DB954] px-4 text-[13px] font-semibold text-black">
        <Play className="h-4 w-4" aria-hidden /> Play {name} here
      </button>
    );
  return (
    <iframe
      title={`${name} on Spotify`}
      src={`https://open.spotify.com/embed/artist/${spotifyId}?utm_source=generator&theme=0`}
      width="100%"
      height="152"
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      className="mt-2 rounded-xl border-0"
    />
  );
}
