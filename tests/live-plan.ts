/**
 * Live check against the real Qloo API (needs QLOO_API_KEY in .env.local). Not part of npm test.
 * Run: npm run test:live   (prints plans for the sample pairs; never prints keys)
 */
import { readFileSync } from 'fs';
import path from 'path';
import { planNight } from '../lib/cg/agent';
import { picksOf } from '../lib/cg/learn';
import { SAMPLE_PAIRS } from '../lib/cg/samples';
import { qlooRateLimitHits } from '../lib/qloo-client';

function loadEnv() {
  try {
    const text = readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* no file */
  }
}

async function main() {
  loadEnv();
  if (process.argv.includes('--rules')) delete process.env.GEMINI_API_KEY;
  for (const pair of SAMPLE_PAIRS) {
    const t0 = Date.now();
    const s = await planNight(pair.make());
    const plan = s.plans[0];
    const [A, B] = s.people;
    console.log(`\n=== ${pair.label} (${((Date.now() - t0) / 1000).toFixed(1)} s, ${plan.planner}${plan.plannerModel ? ' ' + plan.plannerModel : ''}, Qloo ${plan.qlooStatus})`);
    console.log('notices:', plan.notices.join(' | ') || 'none');
    console.log('shared:', plan.commonGround.map((t) => `${t.name}${t.confirmed ? '*' : ''}`).join(', '));
    for (const p of picksOf(plan)) {
      const f = p.fit;
      const ev = f
        ? `${A.name} ${f.a ? `#${f.a.rank} (${f.a.affinity.toFixed(3)})` : '-'} | ${B.name} ${f.b ? `#${f.b.rank} (${f.b.affinity.toFixed(3)})` : '-'} | of ${f.of}${f.share ? ` | split ${Math.round(f.share.a * 100)}/${Math.round(f.share.b * 100)}` : ''}${f.jointRank ? ` | joint #${f.jointRank}` : ''}`
        : 'no fit';
      console.log(`  ${p.kind.padEnd(6)} ${p.name}${p.durationMinutes ? ` [${p.durationMinutes}m]` : ''}  ::  ${ev}`);
      console.log(`         note: ${p.reason}`);
    }
    for (const t of plan.trace.filter((t) => t.type === 'guardrail' || /score|dropped/i.test(t.details))) console.log(`  trace: ${t.action}: ${t.details.slice(0, 220)}`);
    console.log('  Qloo 429s so far:', qlooRateLimitHits());
    console.log('  timing:', plan.trace.filter((t) => ['qloo_search result', 'qloo_compare result', 'qloo_score result', 'Agent briefed', 'qloo_related result'].includes(t.action) || t.type === 'synthesis').map((t) => `${t.action}@${((t.ms || 0) / 1000).toFixed(1)}s`).join(', '));
  }
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
