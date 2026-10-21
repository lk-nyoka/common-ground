/**
 * Evaluation: Common Ground (Qloo + agent) vs the same AI model alone, on the same taste pairs.
 * Needs QLOO_API_KEY and GEMINI_API_KEY in .env.local. Not part of npm test. Run: npm run eval
 *
 * What it measures, per pair:
 *  - verifiable:   share of suggestions Qloo can find at all (an LLM can name things that don't exist
 *                  or are misspelt; Common Ground's picks are Qloo entities by construction)
 *  - time:         films longer than the time the pair said they have (only where Qloo knows the
 *                  runtime; the summary reports how many films could be checked)
 *  - avoid:        picks carrying a tag the pair asked to avoid
 *  - repeats:      suggesting one of the pair's own favourites back to them
 *  - worst-off:    Qloo affinity for the person each pick suits LEAST, and the gap between the two
 *  - discovery:    share of each method's films (found in Qloo) that are in NEITHER person's own top 30
 *
 * Be honest about the worst-off measure: Common Ground chooses picks using these same Qloo scores,
 * so it is expected to win there. It shows the fairness logic works, not that people enjoy the picks.
 * Only the blind study with real pairs (/study) measures that.
 *
 * Output: results/eval-<time>.json (raw, git-ignored: contains Qloo data) and a printed summary.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { planNight } from '../lib/cg/agent';
import { llmOnlyPlan } from '../lib/cg/baseline';
import { picksOf } from '../lib/cg/learn';
import { namesMatch, fold } from '../lib/cg/match';
import { fav, newSession, person } from '../lib/cg/samples';
import type { FavouriteType, Session } from '../lib/cg/types';
import { qlooRelated, qlooScore, qlooSearch } from '../lib/qloo-client';

const T = { artist: 'urn:entity:artist', movie: 'urn:entity:movie', tv: 'urn:entity:tv_show' } as const;
type Pair = { a: [string, FavouriteType][]; b: [string, FavouriteType][]; avoid?: string[] };

const PAIRS: Pair[] = [
  { a: [['Metallica', T.artist]], b: [['Taylor Swift', T.artist]] },
  { a: [['Miriam Makeba', T.artist]], b: [['Tyla', T.artist]], avoid: ['horror'] },
  { a: [['Kendrick Lamar', T.artist]], b: [['Adele', T.artist]] },
  { a: [['The Dark Knight', T.movie]], b: [['The Notebook', T.movie]] },
  { a: [['Burna Boy', T.artist]], b: [['Coldplay', T.artist]] },
  { a: [['Black Panther', T.movie]], b: [['Pride & Prejudice', T.movie]] },
  { a: [['Drake', T.artist]], b: [['Ed Sheeran', T.artist]] },
  { a: [['Breaking Bad', T.tv]], b: [['Friends', T.tv]] },
  { a: [['Beyoncé', T.artist]], b: [['Arctic Monkeys', T.artist]] },
  { a: [['Spirited Away', T.movie]], b: [['Furious 7', T.movie]], avoid: ['horror'] },
  { a: [['Hugh Masekela', T.artist]], b: [['Billie Eilish', T.artist]] },
  { a: [['Interstellar', T.movie]], b: [['Mamma Mia!', T.movie]] },
  { a: [['Rihanna', T.artist]], b: [['Radiohead', T.artist]] },
  { a: [['Stranger Things', T.tv]], b: [['The Crown', T.tv]] },
  { a: [['Black Coffee', T.artist]], b: [['Dolly Parton', T.artist]] },
  { a: [['Inception', T.movie]], b: [["Bridget Jones's Diary", T.movie]] }
];

function loadEnv() {
  try {
    for (const line of readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* none */
  }
}

interface Scored {
  title: string;
  kind: 'watch' | 'listen';
  id?: string;
  type: string;
  a?: number;
  b?: number;
  duration?: number;
  tags?: string[];
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN);
const pctOf = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : 'n/a');

async function scoreItems(items: Scored[], aSig: string[], bSig: string[]) {
  for (const type of [T.movie, T.tv, T.artist]) {
    const ids = items.filter((i) => i.id && i.type === type).map((i) => i.id!);
    if (!ids.length) continue;
    const [ra, rb] = await Promise.all([qlooScore(aSig, type, ids), qlooScore(bSig, type, ids)]);
    for (const i of items) if (i.id && i.type === type) Object.assign(i, { a: ra.data[i.id], b: rb.data[i.id] });
  }
}

async function main() {
  loadEnv();
  if (!process.env.QLOO_API_KEY || !process.env.GEMINI_API_KEY) throw new Error('Needs QLOO_API_KEY and GEMINI_API_KEY in .env.local');
  const rows: any[] = [];
  for (let n = 0; n < PAIRS.length; n++) {
    const pair = PAIRS[n];
    const session: Session = newSession(
      person('a', 'A', pair.a.map(([q, t]) => fav(q, t))),
      person('b', 'B', pair.b.map(([q, t]) => fav(q, t))),
      120,
      pair.avoid || []
    );
    const label = `${pair.a.map((x) => x[0]).join('+')} / ${pair.b.map((x) => x[0]).join('+')}`;
    process.stdout.write(`[${n + 1}/${PAIRS.length}] ${label} ... `);
    const [planned, base] = await Promise.all([planNight(session), llmOnlyPlan(session)]);
    const plan = planned.plans[0];
    const aSig = planned.people[0].favourites.map((f) => f.qlooEntityId).filter(Boolean) as string[];
    const bSig = planned.people[1].favourites.map((f) => f.qlooEntityId).filter(Boolean) as string[];
    if (!aSig.length || !bSig.length) {
      console.log('skipped (a favourite was not found in Qloo)');
      continue;
    }
    if (!base.items.length) {
      console.log(`skipped (the AI-alone baseline didn't answer: ${base.error || 'no items'})`);
      continue;
    }
    const favNames = [...pair.a, ...pair.b].map(([q]) => q);

    const cg: Scored[] = [plan.watch, ...plan.alsoWatch, ...plan.listen]
      .filter(Boolean)
      .map((p) => ({ title: p!.name, kind: p!.kind === 'listen' ? 'listen' : 'watch', id: p!.qlooEntityId, type: p!.type, duration: p!.durationMinutes }));

    const llm: Scored[] = [];
    for (const item of base.items) {
      const res = await qlooSearch(item.title, item.type, 5);
      const hit = res.data.find((e) => namesMatch(e.name, item.title));
      llm.push({ title: item.title, kind: item.kind, id: hit?.id, type: item.type, duration: hit?.durationMinutes, tags: hit?.tags });
    }
    // Tags for Common Ground picks (for the avoid check) come from Qloo search too, same as the baseline.
    for (const i of cg) {
      const res = await qlooSearch(i.title, i.type, 3);
      i.tags = res.data.find((e) => e.id === i.id)?.tags;
    }
    await scoreItems(cg, aSig, bSig);
    await scoreItems(llm, aSig, bSig);

    // Discovery: are Common Ground's films in either person's own top 30?
    const [soloA, soloB] = await Promise.all([qlooRelated(aSig.join(','), T.movie, { take: 30 }), qlooRelated(bSig.join(','), T.movie, { take: 30 })]);
    const solo = new Set([...soloA.data, ...soloB.data].map((e) => e.id));
    const cgFilms = cg.filter((i) => i.type === T.movie && i.id);
    const notInSolo = cgFilms.filter((i) => !solo.has(i.id!)).length;
    const llmFilms = llm.filter((i) => i.type === T.movie && i.id);
    const llmNotInSolo = llmFilms.filter((i) => !solo.has(i.id!)).length;

    const checks = (items: Scored[]) => ({
      total: items.length,
      verifiable: items.filter((i) => i.id).length,
      overTime: items.filter((i) => i.type === T.movie && i.duration && i.duration > session.minutes).length,
      films: items.filter((i) => i.type === T.movie).length,
      filmsWithRuntime: items.filter((i) => i.type === T.movie && i.duration).length,
      avoidHits: items.filter((i) => (pair.avoid || []).some((x) => (i.tags || []).some((t) => fold(t).includes(fold(x))))).length,
      repeats: items.filter((i) => favNames.some((f) => namesMatch(f, i.title))).length,
      worstOff: items.filter((i) => typeof i.a === 'number' && typeof i.b === 'number').map((i) => Math.min(i.a!, i.b!)),
      gaps: items.filter((i) => typeof i.a === 'number' && typeof i.b === 'number').map((i) => Math.abs(i.a! - i.b!))
    });
    const row = { pair: label, planner: plan.planner, model: plan.plannerModel, baselineModel: base.model, baselineError: base.error, cg, llm, cgChecks: checks(cg), llmChecks: checks(llm), cgFilms: cgFilms.length, notInSolo, llmFilms: llmFilms.length, llmNotInSolo };
    rows.push(row);
    console.log(`done (${plan.planner}; baseline ${base.items.length} items${base.error ? `, ${base.error}` : ''})`);
  }

  const sum = (f: (r: any) => number) => rows.reduce((s, r) => s + f(r), 0);
  const all = (side: 'cgChecks' | 'llmChecks', k: 'worstOff' | 'gaps') => rows.flatMap((r) => r[side][k] as number[]);
  const pairsWon = rows.filter((r) => mean(r.cgChecks.worstOff) > mean(r.llmChecks.worstOff)).length;
  const summary = {
    pairs: rows.length,
    common_ground: {
      suggestions: sum((r) => r.cgChecks.total),
      verifiable: pctOf(sum((r) => r.cgChecks.verifiable), sum((r) => r.cgChecks.total)),
      films_over_time: sum((r) => r.cgChecks.overTime),
      films_with_known_runtime: `${sum((r) => r.cgChecks.filmsWithRuntime)} of ${sum((r) => r.cgChecks.films)}`,
      avoid_hits: sum((r) => r.cgChecks.avoidHits),
      repeats_of_favourites: sum((r) => r.cgChecks.repeats),
      mean_worst_off_affinity: +mean(all('cgChecks', 'worstOff')).toFixed(3),
      mean_gap_between_people: +mean(all('cgChecks', 'gaps')).toFixed(3),
      films_in_neither_persons_top30: pctOf(sum((r) => r.notInSolo), sum((r) => r.cgFilms))
    },
    llm_alone: {
      suggestions: sum((r) => r.llmChecks.total),
      verifiable: pctOf(sum((r) => r.llmChecks.verifiable), sum((r) => r.llmChecks.total)),
      films_over_time: sum((r) => r.llmChecks.overTime),
      films_with_known_runtime: `${sum((r) => r.llmChecks.filmsWithRuntime)} of ${sum((r) => r.llmChecks.films)}`,
      avoid_hits: sum((r) => r.llmChecks.avoidHits),
      repeats_of_favourites: sum((r) => r.llmChecks.repeats),
      mean_worst_off_affinity: +mean(all('llmChecks', 'worstOff')).toFixed(3),
      mean_gap_between_people: +mean(all('llmChecks', 'gaps')).toFixed(3),
      films_in_neither_persons_top30: pctOf(sum((r) => r.llmNotInSolo), sum((r) => r.llmFilms))
    },
    pairs_where_common_ground_had_higher_worst_off_affinity: `${pairsWon} of ${rows.length}`,
    common_ground_picks_also_suggested_by_llm: `${rows.reduce((n, r) => n + r.cg.filter((c: Scored) => c.id && r.llm.some((l: Scored) => l.id === c.id)).length, 0)} of ${sum((r) => r.cgChecks.total)}`,
    planners_used: rows.map((r) => r.planner).join(','),
    note: 'Worst-off affinity is measured with the same Qloo scores Common Ground optimises, so it is expected to favour Common Ground. It is not a measure of enjoyment.'
  };
  const dir = path.join(process.cwd(), 'results');
  mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  writeFileSync(path.join(dir, `eval-${stamp}.json`), JSON.stringify({ summary, rows }, null, 2));
  console.log('\nSUMMARY');
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nRaw results: results/eval-${stamp}.json (git-ignored).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
