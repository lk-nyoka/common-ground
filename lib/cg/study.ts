/**
 * Blind study: real pairs rate picks from Common Ground and from the AI alone, mixed together,
 * without knowing which is which. Each person rates on their own. Results leave the phone only
 * as a short code the participants choose to send; nothing is stored on the server.
 */
import { fromBase64Url, toBase64Url } from './invite';

export type Method = 'qloo' | 'llm';
export type Vote = 'yes' | 'maybe' | 'no';

export interface StudyItem {
  id: string;
  title: string;
  kind: 'watch' | 'listen';
  type: string;
  year?: number;
  sources: Method[]; // which method(s) suggested it; never shown to participants
}

export interface StudyResult {
  v: 1;
  pair: string; // random id, no names
  at: string;
  planner?: string;
  items: { s: Method[]; k: 'watch' | 'listen'; a: Vote; b: Vote }[];
}

const VOTES: Vote[] = ['yes', 'maybe', 'no'];

export function encodeResult(r: StudyResult): string {
  return toBase64Url(JSON.stringify(r));
}

export function decodeResult(code: string): StudyResult | null {
  try {
    const raw = JSON.parse(fromBase64Url(code.trim()));
    if (!raw || raw.v !== 1 || !Array.isArray(raw.items)) return null;
    const items = raw.items
      .filter((i: any) => i && Array.isArray(i.s) && VOTES.includes(i.a) && VOTES.includes(i.b))
      .map((i: any) => ({ s: i.s.filter((m: unknown) => m === 'qloo' || m === 'llm'), k: i.k === 'listen' ? 'listen' : 'watch', a: i.a, b: i.b }))
      .filter((i: any) => i.s.length);
    return { v: 1, pair: String(raw.pair || '').slice(0, 20), at: String(raw.at || '').slice(0, 30), planner: raw.planner ? String(raw.planner).slice(0, 20) : undefined, items };
  } catch {
    return null;
  }
}

/** Fisher-Yates shuffle, so neither method is always shown first. */
export function shuffle<T>(xs: T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface MethodSummary {
  items: number;
  bothYes: number; // both people said yes
  vetoed: number; // at least one person said no
  worstOffScore: number; // mean of min(score A, score B), yes=1, maybe=0.5, no=0
}

const score = (v: Vote) => (v === 'yes' ? 1 : v === 'maybe' ? 0.5 : 0);

/** Items suggested by both methods count for both. */
export function summarise(results: StudyResult[]): { pairs: number; qloo: MethodSummary; llm: MethodSummary } {
  const empty = (): MethodSummary & { sum: number } => ({ items: 0, bothYes: 0, vetoed: 0, worstOffScore: 0, sum: 0 });
  const acc = { qloo: empty(), llm: empty() };
  for (const r of results)
    for (const i of r.items)
      for (const m of i.s) {
        const t = acc[m];
        t.items++;
        if (i.a === 'yes' && i.b === 'yes') t.bothYes++;
        if (i.a === 'no' || i.b === 'no') t.vetoed++;
        t.sum += Math.min(score(i.a), score(i.b));
      }
  const fin = (t: MethodSummary & { sum: number }): MethodSummary => ({ items: t.items, bothYes: t.bothYes, vetoed: t.vetoed, worstOffScore: t.items ? t.sum / t.items : 0 });
  return { pairs: results.length, qloo: fin(acc.qloo), llm: fin(acc.llm) };
}
