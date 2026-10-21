/**
 * Taste drops: a small model that runs on each person's own phone and learns what they actually
 * try. It is Bayesian logistic regression with a Gaussian prior on each weight, updated online after
 * every reaction (Chapelle & Li, "An Empirical Evaluation of Thompson Sampling", NIPS 2011).
 *
 * To choose the next drop it uses Thompson sampling: it draws one plausible set of weights from
 * what it believes so far and picks the best candidate under that draw. Usually that is the safe
 * pick; now and then it is something less certain, which is how it learns instead of repeating
 * itself. Qloo supplies the candidates and the strongest feature (affinity); the model learns how
 * much this person trusts each signal.
 *
 * Nothing here leaves the device. The model is a few dozen numbers in localStorage.
 */

export const FEATURES = ['bias', 'affinity', 'rank', 'local', 'artist', 'film', 'tagMatch', 'popularity', 'novelty'] as const;
export type FeatureName = (typeof FEATURES)[number];
export type Features = Record<FeatureName, number>;

/** What the server sends: a Qloo candidate with the numbers the model needs. */
export interface DropCandidate {
  id: string;
  name: string;
  type: string;
  image?: string;
  year?: number;
  tags: string[];
  affinity: number; // Qloo affinity for this person's favourites, 0-1
  popularity?: number; // Qloo popularity, 0-1
  local: boolean; // carries Qloo's South African music tag
  spotifyId?: string;
  netflixId?: string;
}

export interface DropModel {
  version: 1;
  mean: number[];
  precision: number[];
  /** Tags of things this person loved or tried, with counts, for the tag-match feature. */
  likedTags: Record<string, number>;
  /** Ids already shown, so drops don't repeat. */
  shown: string[];
  history: { id: string; name: string; y: 0 | 1; at: number }[];
  updates: number;
}

/**
 * Starting beliefs, before any reactions: trust Qloo's affinity and rank most, mild interest in
 * tag matches, no view on anything else. Precision 1 means "easily moved by a few reactions".
 */
const PRIOR_MEAN: Record<FeatureName, number> = {
  bias: -0.5,
  affinity: 2.0,
  rank: 1.0,
  local: 0,
  artist: 0,
  film: 0,
  tagMatch: 1.0,
  popularity: 0,
  novelty: 0
};

export function newModel(): DropModel {
  return {
    version: 1,
    mean: FEATURES.map((f) => PRIOR_MEAN[f]),
    precision: FEATURES.map(() => 1),
    likedTags: {},
    shown: [],
    history: [],
    updates: 0
  };
}

/** Accept a stored model only if it has the right shape; otherwise start again. */
export function loadModel(raw: unknown): DropModel {
  const m = raw as DropModel;
  if (
    !m ||
    m.version !== 1 ||
    !Array.isArray(m.mean) ||
    m.mean.length !== FEATURES.length ||
    !Array.isArray(m.precision) ||
    m.precision.length !== FEATURES.length ||
    ![...m.mean, ...m.precision].every((v) => typeof v === 'number' && Number.isFinite(v)) ||
    m.precision.some((q) => q <= 0)
  )
    return newModel();
  return {
    ...m,
    likedTags: m.likedTags && typeof m.likedTags === 'object' ? m.likedTags : {},
    shown: Array.isArray(m.shown) ? m.shown.slice(-200) : [],
    history: Array.isArray(m.history) ? m.history.slice(-100) : [],
    updates: Number(m.updates) || 0
  };
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
const dot = (w: number[], x: number[]) => w.reduce((s, wi, i) => s + wi * x[i], 0);

/** Turn a candidate into model inputs. `rank` is its place among this batch by affinity (1 = best). */
export function featuresOf(c: DropCandidate, model: DropModel, rankNorm: number): Features {
  const tags = c.tags.map((t) => t.toLowerCase());
  const liked = model.likedTags;
  const total = Object.values(liked).reduce((s, n) => s + n, 0);
  const tagMatch = total && tags.length ? Math.min(1, tags.reduce((s, t) => s + (liked[t] ? 1 : 0), 0) / Math.min(5, tags.length)) : 0;
  const isArtist = c.type.includes('artist');
  return {
    bias: 1,
    affinity: clamp01(c.affinity),
    rank: clamp01(rankNorm),
    local: c.local ? 1 : 0,
    artist: isArtist ? 1 : 0,
    film: isArtist ? 0 : 1,
    tagMatch,
    popularity: clamp01(c.popularity ?? 0.5),
    // Lower popularity counts as more of a discovery.
    novelty: 1 - clamp01(c.popularity ?? 0.5)
  };
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);
const vec = (f: Features) => FEATURES.map((k) => f[k]);

/** The model's best guess (no sampling) that this person will try it. */
export function predict(model: DropModel, f: Features): number {
  return sigmoid(dot(model.mean, vec(f)));
}

/** Standard normal draw (Box-Muller). `rand` is injectable so tests are repeatable. */
function gauss(rand: () => number) {
  const u = Math.max(1e-12, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export interface RankedDrop {
  candidate: DropCandidate;
  features: Features;
  p: number; // the model's best guess, 0-1
  sampled: number; // the Thompson draw's score
  exploring: boolean; // picked because of uncertainty rather than the best guess
  reasons: string[];
}

/** Rank this batch with one Thompson draw. Returns best first, skipping anything already shown. */
export function rankDrops(model: DropModel, candidates: DropCandidate[], rand: () => number = Math.random): RankedDrop[] {
  const fresh = candidates.filter((c) => !model.shown.includes(c.id));
  if (!fresh.length) return [];
  const byAff = [...fresh].sort((x, y) => y.affinity - x.affinity);
  const rankOf = new Map(byAff.map((c, i) => [c.id, byAff.length > 1 ? 1 - i / (byAff.length - 1) : 1]));
  const draw = model.mean.map((m, i) => m + gauss(rand) / Math.sqrt(model.precision[i]));
  const scored = fresh.map((c) => {
    const features = featuresOf(c, model, rankOf.get(c.id) ?? 0.5);
    const x = vec(features);
    return { candidate: c, features, p: sigmoid(dot(model.mean, x)), sampled: sigmoid(dot(draw, x)), exploring: false, reasons: [] as string[] };
  });
  const bestGuess = [...scored].sort((x, y) => y.p - x.p)[0];
  scored.sort((x, y) => y.sampled - x.sampled);
  return scored.map((s) => ({ ...s, exploring: s === scored[0] && s !== bestGuess, reasons: explain(model, s.features, s.candidate) }));
}

/** Plain-language reasons, from the features that push this pick up the most. */
export function explain(model: DropModel, f: Features, c: DropCandidate): string[] {
  const parts = FEATURES.map((k, i) => ({ k, v: model.mean[i] * f[k] })).filter((p) => p.k !== 'bias' && p.v > 0.15);
  parts.sort((x, y) => y.v - x.v);
  const say: Record<FeatureName, string> = {
    bias: '',
    affinity: `Qloo rates it ${Math.round(f.affinity * 100)}/100 for fans of your favourites`,
    rank: 'one of the closest matches in this batch',
    local: 'it’s South African, and you’ve been trying Mzansi picks',
    artist: 'you’ve been trying music more than films',
    film: 'you’ve been trying films more than music',
    tagMatch: `shares tags with things you liked${c.tags[0] ? ` (${c.tags.slice(0, 2).join(', ').toLowerCase()})` : ''}`,
    popularity: 'it’s widely loved, and you tend to go for crowd favourites',
    novelty: 'it’s less well known, and you tend to like discoveries'
  };
  return parts.slice(0, 3).map((p) => say[p.k]);
}

/**
 * Learn from one reaction (y = 1: tried or loved it; 0: not for me). A few Newton steps find the
 * new posterior mode, then each weight's precision grows by how informative this example was.
 */
export function update(model: DropModel, f: Features, y: 0 | 1, item?: { id: string; name: string; tags: string[] }, now = Date.now()): DropModel {
  const x = vec(f);
  const m0 = model.mean;
  const q = model.precision;
  let w = [...m0];
  for (let step = 0; step < 8; step++) {
    const p = sigmoid(dot(w, x));
    // Gradient and diagonal Hessian of: 0.5 Σ q_i (w_i - m_i)^2 - [y log p + (1 - y) log (1 - p)]
    const next = w.map((wi, i) => {
      const g = q[i] * (wi - m0[i]) + (p - y) * x[i];
      const h = q[i] + p * (1 - p) * x[i] * x[i];
      return wi - g / h;
    });
    const moved = next.reduce((s, v, i) => s + Math.abs(v - w[i]), 0);
    w = next;
    if (moved < 1e-6) break;
  }
  const p = sigmoid(dot(w, x));
  const precision = q.map((qi, i) => qi + p * (1 - p) * x[i] * x[i]);
  const likedTags = { ...model.likedTags };
  if (y === 1 && item) for (const t of item.tags.slice(0, 8)) likedTags[t.toLowerCase()] = (likedTags[t.toLowerCase()] || 0) + 1;
  return {
    ...model,
    mean: w,
    precision,
    likedTags,
    shown: item ? [...model.shown.filter((s) => s !== item.id), item.id].slice(-200) : model.shown,
    history: item ? [...model.history, { id: item.id, name: item.name, y, at: now }].slice(-100) : model.history,
    updates: model.updates + 1
  };
}

/** Mark as shown without a reaction (for example, when it went out as a notification). */
export function markShown(model: DropModel, id: string): DropModel {
  return { ...model, shown: [...model.shown.filter((s) => s !== id), id].slice(-200) };
}

/** What the model has learned, in words, for the "How it learns" panel. */
export function learnedSummary(model: DropModel): string[] {
  if (!model.updates) return ['Nothing yet. For now it trusts Qloo’s affinity most. React to a few drops and it adapts to you.'];
  const out: string[] = [];
  const at = (k: FeatureName) => model.mean[FEATURES.indexOf(k)] - PRIOR_MEAN[k];
  if (at('local') > 0.3) out.push('You try South African picks more than most.');
  if (at('local') < -0.3) out.push('South African picks haven’t landed so far, so it shows fewer.');
  if (at('artist') - at('film') > 0.3) out.push('Music lands better than films for you.');
  if (at('film') - at('artist') > 0.3) out.push('Films land better than music for you.');
  if (at('novelty') > 0.3) out.push('You like discoveries over the obvious picks.');
  if (at('popularity') > 0.3) out.push('You go for crowd favourites.');
  if (at('affinity') > 0.3) out.push('Qloo’s closest matches work well for you.');
  if (at('affinity') < -0.3) out.push('Qloo’s top matches miss for you sometimes, so it explores more.');
  if (!out.length) out.push('No strong pattern yet. It keeps a little room to explore.');
  const tried = model.history.filter((h) => h.y === 1).length;
  out.push(`Learned from ${model.updates} reaction${model.updates === 1 ? '' : 's'} (${tried} yes).`);
  return out;
}
