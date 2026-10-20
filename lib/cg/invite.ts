/**
 * Invite links. Person A's half of the setup travels in the URL fragment (after "#"), which
 * browsers never send to the server, so there is no database and nothing is stored. Person B
 * opens the link on their own phone and adds their own favourites.
 */
import type { FavouriteType } from './types';

export interface InviteHalf {
  name: string;
  favs: { query: string; type: FavouriteType }[];
}

export interface Invite {
  v: 1;
  from: InviteHalf;
  toName: string; // what A called B (B can change it)
  minutes: number;
  avoid: string[];
}

const TYPES: FavouriteType[] = ['urn:entity:artist', 'urn:entity:movie', 'urn:entity:tv_show'];
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');

export function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeInvite(inv: Invite): string {
  const compact = {
    v: 1,
    n: inv.from.name,
    f: inv.from.favs.map((f) => [f.query, TYPES.indexOf(f.type)]),
    t: inv.toName,
    m: inv.minutes,
    x: inv.avoid
  };
  return toBase64Url(JSON.stringify(compact));
}

/** Parse an invite from a URL hash like "#invite=...". Returns null for anything malformed. */
export function decodeInvite(hash: string): Invite | null {
  const m = hash.match(/(?:^#|&)invite=([A-Za-z0-9_-]{4,4000})/);
  if (!m) return null;
  try {
    const raw = JSON.parse(fromBase64Url(m[1]));
    if (!raw || raw.v !== 1 || !Array.isArray(raw.f)) return null;
    const favs = raw.f
      .slice(0, 3)
      .map((x: unknown) => (Array.isArray(x) ? { query: clean(x[0], 60), type: TYPES[Number(x[1])] || TYPES[0] } : null))
      .filter((f: { query: string } | null): f is { query: string; type: FavouriteType } => !!f && !!f.query);
    if (!favs.length) return null;
    const minutes = Number(raw.m);
    return {
      v: 1,
      from: { name: clean(raw.n, 24) || 'Your friend', favs },
      toName: clean(raw.t, 24),
      minutes: Number.isFinite(minutes) ? Math.min(300, Math.max(15, Math.round(minutes))) : 120,
      avoid: Array.isArray(raw.x) ? raw.x.slice(0, 5).map((e: unknown) => clean(e, 30)).filter(Boolean) : []
    };
  } catch {
    return null;
  }
}

export function inviteUrl(origin: string, inv: Invite): string {
  return `${origin}/#invite=${encodeInvite(inv)}`;
}
