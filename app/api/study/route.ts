import { NextRequest, NextResponse } from 'next/server';
import { planNight } from '../../../lib/cg/agent';
import { llmOnlyPlan } from '../../../lib/cg/baseline';
import { qlooSearch } from '../../../lib/qloo-client';
import { picksOf } from '../../../lib/cg/learn';
import { namesMatch } from '../../../lib/cg/match';
import { shuffle, type StudyItem } from '../../../lib/cg/study';
import { cleanSession, LIMITS } from '../../../lib/cg/validate';
import { guarded, readJson } from '../../../lib/server/http';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Blind study: build Common Ground's plan and the AI-alone plan for the same input, merge them,
 * and return them shuffled. Titles only, so artwork can't reveal which method made which pick.
 */
export async function POST(request: NextRequest) {
  return guarded(request, 'study', async () => {
    const body = (await readJson(request, LIMITS.bodyBytes)) as { session?: unknown };
    const session = cleanSession(body?.session);
    const [planned, base] = await Promise.all([planNight(session), llmOnlyPlan(session)]);
    const plan = planned.plans[0];
    const items: StudyItem[] = [];
    const add = (title: string, kind: 'watch' | 'listen', type: string, method: 'qloo' | 'llm', year?: number) => {
      const same = items.find((i) => i.kind === kind && namesMatch(i.title, title));
      if (same) {
        if (!same.sources.includes(method)) same.sources.push(method);
        return;
      }
      items.push({ id: `i${items.length + 1}`, title, kind, type, year, sources: [method] });
    };
    for (const p of [plan.watch, ...plan.alsoWatch, ...plan.listen]) if (p) add(p.name, p.kind === 'listen' ? 'listen' : 'watch', p.type, 'qloo', p.year);
    // Show the AI's suggestions under Qloo's standard names where Qloo knows them, so spelling
    // style can't hint at which method made which pick.
    const canonical = await Promise.all(
      base.items.map(async (b) => {
        const res = await qlooSearch(b.title, b.type, 3);
        const hit = res.data.find((e) => namesMatch(e.name, b.title) || namesMatch(e.name.replace(/\s+/g, ''), b.title.replace(/\s+/g, '')));
        return hit ? { ...b, title: hit.name, year: b.year ?? hit.year } : b;
      })
    );
    for (const b of canonical) add(b.title, b.kind, b.type, 'llm', b.year);
    const qloo = items.filter((i) => i.sources.includes('qloo')).length;
    const llm = items.filter((i) => i.sources.includes('llm')).length;
    if (!qloo || !llm) {
      return NextResponse.json(
        { error: !qloo ? 'Qloo didn’t return enough for these favourites. Try different ones.' : 'The AI-alone comparison didn’t answer. Please try again in a minute.' },
        { status: 503 }
      );
    }
    console.log(JSON.stringify({ event: 'study_items', qloo, llm, overlap: items.filter((i) => i.sources.length === 2).length, planner: plan.planner }));
    return NextResponse.json({ items: shuffle(items), planner: plan.planner, picks: picksOf(plan).length });
  });
}
