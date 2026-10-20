/**
 * Gentle visit: Qloo vs an LLM alone, on the same seeds.
 *
 * This script prints only what the APIs actually return. There is no pre-written
 * verdict: read the two columns and judge for yourself, then quote real examples
 * in the Devpost submission.
 *
 * Usage (PowerShell):
 *   1. Put your keys in .env.local (see .env.example). Set QLOO_CAPTURE=true to also
 *      save the Qloo responses locally as a demo backup.
 *   2. In one terminal:   npm run dev
 *   3. In another:        npm run test:qloo
 *
 * Output: results/comparison-<time>.md and .json (git-ignored: Qloo's terms say not to
 * publish their response data in a public repo).
 */
import { promises as fs } from 'fs';
import path from 'path';

const APP_URL = process.env.APP_URL || 'http://localhost:3000';

// The same seeds as the sample families. Add your own here.
const CASES = [
  {
    label: 'Nomvula: born 1948, Soweto',
    region: 'Soweto, Johannesburg, South Africa',
    birthYear: 1948,
    era: [1960, 1978],
    seeds: [{ query: 'Miriam Makeba', type: 'urn:entity:artist' }]
  },
  {
    label: 'Dorothy: born 1946, Ohio',
    region: 'Ohio, USA',
    birthYear: 1946,
    era: [1958, 1976],
    seeds: [
      { query: 'Patsy Cline', type: 'urn:entity:artist' },
      { query: 'The Sound of Music', type: 'urn:entity:movie' }
    ]
  }
];

const TARGETS = ['urn:entity:artist', 'urn:entity:movie'];

async function loadEnvLocal() {
  for (const f of ['.env.local', '.env']) {
    try {
      const text = await fs.readFile(path.join(process.cwd(), f), 'utf8');
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    } catch {
      /* file not present */
    }
  }
}

async function getJson(url) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status} ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

async function qlooSide(c) {
  const out = [];
  for (const s of c.seeds) {
    const search = await getJson(`${APP_URL}/api/qloo/search?${new URLSearchParams({ query: s.query, type: s.type })}`);
    const match = (search.results || [])[0];
    const entry = { seed: s.query, source: search.source, error: search.error, matched: match || null, related: {} };
    if (match) {
      for (const t of TARGETS) {
        const r = await getJson(
          `${APP_URL}/api/qloo/insights?${new URLSearchParams({ entityId: match.id, filterType: t, maxYear: String(c.era[1]) })}`
        );
        entry.related[t] = { source: r.source, error: r.error, items: (r.results || []).map((e) => ({ name: e.name, year: e.year ?? null })) };
      }
    }
    out.push(entry);
  }
  return out;
}

async function llmSide(c) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { skipped: 'GEMINI_API_KEY not set, so there is no LLM-alone column.' };
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const prompt = `Someone born in ${c.birthYear} grew up in ${c.region}. Their family says they loved: ${c.seeds
    .map((s) => s.query)
    .join(', ')}. Without any other data, list 8 musical artists and 5 films they would most likely connect with from roughly ${c.era[0]} to ${c.era[1]}. Reply with JSON only: {"artists": ["..."], "films": [{"title": "...", "year": 1965}]}`;
  const res = await fetch(`${process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com'}/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, responseMimeType: 'application/json' } })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: `Gemini HTTP ${res.status}: ${JSON.stringify(data).slice(0, 300)}` };
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  try {
    return { model, prompt, ...JSON.parse(text) };
  } catch {
    return { model, prompt, raw: text };
  }
}

function md(results) {
  const lines = [`# Qloo vs an LLM alone`, ``, `Run at ${new Date().toISOString()}. Raw API output, no edits.`, ``];
  for (const r of results) {
    lines.push(`## ${r.case.label} (era ${r.case.era[0]}–${r.case.era[1]})`, ``);
    lines.push(`### With Qloo`);
    for (const q of r.qloo) {
      lines.push(`- **${q.seed}** → ${q.matched ? `matched "${q.matched.name}" [${q.source}]` : `no match [${q.source}${q.error ? `: ${q.error}` : ''}]`}`);
      for (const [t, rel] of Object.entries(q.related)) {
        const items = rel.items.map((i) => `${i.name}${i.year ? ` (${i.year})` : ''}`).join(', ') || 'none';
        lines.push(`  - ${t.replace('urn:entity:', '')} [${rel.source}]: ${items}`);
      }
    }
    lines.push(``, `### LLM alone`);
    if (r.llm.skipped || r.llm.error) lines.push(`- ${r.llm.skipped || r.llm.error}`);
    else if (r.llm.raw) lines.push('```', r.llm.raw, '```');
    else {
      lines.push(`- Model: ${r.llm.model}`);
      lines.push(`- Artists: ${(r.llm.artists || []).join(', ')}`);
      lines.push(`- Films: ${(r.llm.films || []).map((f) => (typeof f === 'string' ? f : `${f.title}${f.year ? ` (${f.year})` : ''}`)).join(', ')}`);
    }
    lines.push(``);
  }
  lines.push(`## Your notes`, ``, `Where does Qloo find something specific to these favourites that the LLM missed? Where is the LLM just as good? Write 3–4 honest examples here for the submission.`, ``);
  return lines.join('\n');
}

async function main() {
  await loadEnvLocal();
  try {
    const status = await getJson(`${APP_URL}/api/status`);
    console.log(`App at ${APP_URL}: Qloo key ${status.qloo.keySet ? 'set' : 'NOT set'}, ${status.qloo.savedResponses} saved responses, LLM ${status.llm.configured ? status.llm.model : 'not set'}.`);
    if (!status.qloo.keySet) console.log('Without a Qloo key the Qloo column can only use saved responses (or will be empty).');
  } catch {
    console.error(`Can't reach the app at ${APP_URL}. Start it first with "npm run dev" in another terminal.`);
    process.exit(1);
  }

  const results = [];
  for (const c of CASES) {
    console.log(`\nRunning: ${c.label}`);
    results.push({ case: c, qloo: await qlooSide(c), llm: await llmSide(c) });
  }

  const dir = path.join(process.cwd(), 'results');
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const report = md(results);
  await fs.writeFile(path.join(dir, `comparison-${stamp}.md`), report, 'utf8');
  await fs.writeFile(path.join(dir, `comparison-${stamp}.json`), JSON.stringify(results, null, 2), 'utf8');
  console.log('\n' + report);
  console.log(`Saved to results/comparison-${stamp}.md (git-ignored).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
