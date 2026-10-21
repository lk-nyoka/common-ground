import { fromBase64Url, toBase64Url } from './invite';
import type { Person } from './types';

/** Who the drops are for, carried in the link's #fragment (never sent to the server as a URL). */
export interface DropsProfile {
  name: string;
  signals: { id: string; name: string }[];
  local: boolean;
}

const ID = /^[A-Za-z0-9_:-]{1,80}$/;

export function profileFromPerson(p: Person, local: boolean): DropsProfile {
  const fav = p.favourites.filter((f) => f.qlooEntityId).map((f) => ({ id: f.qlooEntityId!, name: f.qlooName || f.query }));
  const liked = p.liked.map((l) => ({ id: l.qlooEntityId, name: l.name }));
  const seen = new Set<string>();
  const signals = [...fav, ...liked.reverse()].filter((s) => !seen.has(s.id) && !!seen.add(s.id)).slice(0, 6);
  return { name: p.name, signals, local };
}

export function encodeProfile(p: DropsProfile): string {
  return toBase64Url(JSON.stringify({ n: p.name, s: p.signals.map((s) => [s.id, s.name]), l: p.local ? 1 : 0 }));
}

export function decodeProfile(s: string): DropsProfile | null {
  try {
    const o = JSON.parse(fromBase64Url(s));
    const signals = (Array.isArray(o?.s) ? o.s : [])
      .filter((x: unknown) => Array.isArray(x) && typeof x[0] === 'string' && ID.test(x[0]))
      .slice(0, 6)
      .map((x: [string, unknown]) => ({ id: x[0], name: String(x[1] || '').slice(0, 120) }));
    if (!signals.length) return null;
    return { name: String(o.n || 'You').slice(0, 24), signals, local: o.l !== 0 };
  } catch {
    return null;
  }
}

export const dropsUrl = (origin: string, p: DropsProfile) => `${origin}/drops#p=${encodeProfile(p)}`;
