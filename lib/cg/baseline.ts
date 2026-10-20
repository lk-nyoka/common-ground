/**
 * The "LLM alone" baseline: the same AI model, the same favourites, time and things to avoid,
 * but no Qloo. Used only by the evaluation script and the blind study, so Common Ground can be
 * compared honestly against what a plain AI prompt would suggest.
 */
import { extractJson, geminiGenerate, llmIsConfigured, modelOf } from '../llm';
import type { Session } from './types';

export interface BaselineItem {
  title: string;
  kind: 'watch' | 'listen';
  type: 'urn:entity:movie' | 'urn:entity:tv_show' | 'urn:entity:artist';
  year?: number;
}

export interface Baseline {
  items: BaselineItem[];
  model?: string;
  error?: string;
}

const SYSTEM = `You help two people plan a night in that they will BOTH enjoy. You do not know their names: call them A and B.
Reply with ONE JSON object and nothing else:
{"watch": [{"title": "...", "type": "movie" | "tv_show", "year": 2004}], "listen": [{"artist": "..."}]}
Give exactly 3 things to watch (films that fit the time, or TV shows) and exactly 3 music artists.
Don't suggest anything either person already listed. Respect the things to avoid.`;

export async function llmOnlyPlan(session: Session): Promise<Baseline> {
  if (!llmIsConfigured()) return { items: [], error: 'GEMINI_API_KEY is not set' };
  const [A, B] = session.people;
  const list = (p: typeof A) => p.favourites.map((f) => `${f.query} (${f.type.replace('urn:entity:', '').replace('tv_show', 'TV show')})`).join(', ') || 'nothing';
  const brief = `A loves: ${list(A)}.
B loves: ${list(B)}.
Time together: ${session.minutes} minutes, at home.
Avoid: ${session.exclusions.join(', ') || 'nothing given'}.`;
  try {
    const reply = await geminiGenerate({ system: SYSTEM, contents: [{ role: 'user', parts: [{ text: brief }] }], timeoutMs: 20000 });
    const json = extractJson(reply.parts.map((p) => p.text || '').join(''));
    if (!json) return { items: [], model: modelOf(reply), error: 'The model did not return JSON' };
    const items: BaselineItem[] = [];
    for (const w of Array.isArray(json.watch) ? json.watch.slice(0, 3) : []) {
      if (w && typeof w.title === 'string' && w.title.trim())
        items.push({
          title: w.title.trim().slice(0, 120),
          kind: 'watch',
          type: w.type === 'tv_show' ? 'urn:entity:tv_show' : 'urn:entity:movie',
          year: Number.isFinite(Number(w.year)) ? Number(w.year) : undefined
        });
    }
    for (const l of Array.isArray(json.listen) ? json.listen.slice(0, 3) : []) {
      const name = typeof l === 'string' ? l : l?.artist;
      if (typeof name === 'string' && name.trim()) items.push({ title: name.trim().slice(0, 120), kind: 'listen', type: 'urn:entity:artist' });
    }
    return { items, model: modelOf(reply) };
  } catch (err: any) {
    return { items: [], error: String(err?.message || err).slice(0, 200) };
  }
}
