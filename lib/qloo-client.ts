/**
 * Qloo client (server-side only).
 *
 * Honesty rules this file enforces:
 * - Data is labelled 'live' only when it came from a Qloo API call just now.
 * - Data is labelled 'saved' only when it is a real Qloo response that was captured to
 *   data/qloo-fixtures/ by an earlier live call (set QLOO_CAPTURE=true locally to capture).
 *   Qloo's terms allow private server-side caching but not publishing their data in a public
 *   repo, so that folder is git-ignored: it is a local backup, not part of the deployed app.
 * - Otherwise the result is 'unavailable' and empty. Nothing is invented here.
 *
 * Privacy: only cultural search strings and Qloo entity IDs are sent to Qloo.
 */
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { QlooEntity, QlooResult } from './types';

const BASE_URL = process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com';
const FIXTURE_DIR = path.join(process.cwd(), 'data', 'qloo-fixtures');
const TIMEOUT_MS = 8000;

/**
 * Short-lived in-memory cache of live responses (Qloo allows private server-side caching).
 * Makes repeat demos fast and saves quota. It lives only as long as the server process.
 */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { raw: unknown; at: number }>();

/** For tests only: forget cached responses. */
export function clearQlooCache() {
  cache.clear();
}

/**
 * Qloo rate-limits the hackathon key, so live calls go through a small limiter
 * (3 at a time by default, QLOO_CONCURRENCY to change) and are retried on HTTP 429 with backoff.
 */
const MAX_CONCURRENT = Number(process.env.QLOO_CONCURRENCY || 3);
let active = 0;
const waiting: Array<() => void> = [];
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((resolve) => waiting.push(resolve));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let rateLimited = 0;
/** For diagnostics: how many HTTP 429 answers Qloo has sent since the server started. */
export function qlooRateLimitHits() {
  return rateLimited;
}

export function qlooKeyIsSet(): boolean {
  return Boolean(process.env.QLOO_API_KEY);
}

export async function savedFixtureCount(): Promise<number> {
  try {
    const files = await fs.readdir(FIXTURE_DIR);
    return files.filter((f) => f.endsWith('.json')).length;
  } catch {
    return 0;
  }
}

/** Canonical request string: endpoint plus sorted query params. Used as the fixture key. */
function canonical(endpoint: string, params: Record<string, string>): string {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join('&');
  return `${endpoint}?${sorted}`;
}

function fixtureName(endpoint: string, params: Record<string, string>): string {
  const key = canonical(endpoint, params);
  const hash = createHash('sha1').update(key).digest('hex').slice(0, 10);
  const label = (params.query || params['signal.interests.entities'] || 'request')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40);
  const kind = endpoint.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return `${kind}__${label}__${hash}.json`;
}

async function readFixture(name: string): Promise<{ capturedAt: string; response: unknown } | null> {
  try {
    const raw = await fs.readFile(path.join(FIXTURE_DIR, name), 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && parsed.response) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function writeFixture(name: string, request: string, response: unknown) {
  if (process.env.QLOO_CAPTURE !== 'true') return;
  try {
    await fs.mkdir(FIXTURE_DIR, { recursive: true });
    const body = { capturedAt: new Date().toISOString(), request, response };
    await fs.writeFile(path.join(FIXTURE_DIR, name), JSON.stringify(body, null, 2), 'utf8');
  } catch (err) {
    // Read-only filesystems (e.g. Vercel) can't capture; that's fine.
    console.warn('Could not save Qloo fixture:', err);
  }
}

/**
 * GET a Qloo endpoint. Tries live first (if a key is set), then a captured fixture.
 * Returns the raw JSON so callers can parse it, plus where it came from.
 */
async function qlooGet(
  endpoint: string,
  params: Record<string, string>
): Promise<{ source: 'live' | 'saved' | 'unavailable'; raw: any; capturedAt?: string; error?: string; status?: number }> {
  const name = fixtureName(endpoint, params);
  const request = canonical(endpoint, params);
  const apiKey = process.env.QLOO_API_KEY;
  let error: string | undefined;
  let status: number | undefined;

  const hit = cache.get(request);
  if (apiKey && hit && Date.now() - hit.at < CACHE_TTL_MS) return { source: 'live', raw: hit.raw };

  if (apiKey) {
    try {
      const url = `${BASE_URL}${endpoint}?${new URLSearchParams(params).toString()}`;
      let res: Response | undefined;
      // Up to 3 tries on HTTP 429, with short waits, so a busy key can't stall a plan for long.
      for (let attempt = 0; attempt < 3; attempt++) {
        res = await withSlot(async () => {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
          try {
            return await fetch(url, { headers: { 'X-Api-Key': apiKey, Accept: 'application/json' }, cache: 'no-store', signal: controller.signal });
          } finally {
            clearTimeout(timer);
          }
        });
        if (res.status !== 429) break;
        rateLimited++;
        const retryAfter = Number(res.headers.get('retry-after'));
        if (attempt < 2) await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 2500) : 600 * 2 ** attempt);
      }
      if (!res) throw new Error('no response');
      status = res.status;
      if (res.ok) {
        const raw = await res.json();
        if (cache.size > 500) cache.clear();
        cache.set(request, { raw, at: Date.now() });
        await writeFixture(name, request, raw);
        return { source: 'live', raw };
      }
      const text = await res.text().catch(() => '');
      error = `Qloo returned HTTP ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`;
    } catch (err: any) {
      error = err?.name === 'AbortError' ? 'Qloo request timed out' : `Qloo request failed: ${err?.message || err}`;
    }
  } else {
    error = 'QLOO_API_KEY is not set';
  }

  const saved = await readFixture(name);
  if (saved) return { source: 'saved', raw: saved.response, capturedAt: saved.capturedAt };

  return { source: 'unavailable', raw: null, error, status };
}

function toYear(v: unknown): number | undefined {
  if (typeof v === 'number' && v > 1800 && v < 2100) return Math.round(v);
  if (typeof v === 'string') {
    const m = v.match(/(1[89]\d\d|20\d\d)/);
    if (m) return parseInt(m[1], 10);
  }
  return undefined;
}

/** Normalise one raw Qloo entity. Defensive, because response shapes vary by endpoint. */
function normaliseEntity(e: any, fallbackType?: string): QlooEntity | null {
  if (!e || typeof e !== 'object') return null;
  const id = e.entity_id || e.id;
  const name = e.name || e.title;
  if (!id || !name) return null;
  const props = e.properties || {};
  // Insights results say type "urn:entity" and put the real type in "subtype";
  // search results use a "types" array. Prefer whichever is specific.
  const specific = (t: unknown): t is string => typeof t === 'string' && /^urn:entity:[a-z_]+$/.test(t);
  const type =
    [e.subtype, e.type, ...(Array.isArray(e.types) ? e.types : []), fallbackType].find(specific) ||
    e.type ||
    'unknown';
  const year =
    toYear(props.release_year) ??
    toYear(props.release_date) ??
    toYear(props.year) ??
    toYear(e.release_year) ??
    toYear(e.year);
  const affinity = typeof e.query?.affinity === 'number' ? e.query.affinity : undefined;
  const explainList = e.query?.explainability?.['signal.interests.entities'];
  const explain: Record<string, number> | undefined = Array.isArray(explainList)
    ? Object.fromEntries(
        explainList
          .filter((x: any) => x && typeof x.entity_id === 'string' && typeof x.score === 'number')
          .map((x: any) => [String(x.entity_id), x.score as number])
      )
    : undefined;
  const duration = typeof props.duration === 'number' && props.duration > 0 && props.duration < 1000 ? Math.round(props.duration) : undefined;
  const ext = e.external && typeof e.external === 'object' ? e.external : {};
  const first = (k: string): any => (Array.isArray(ext[k]) ? ext[k][0] : undefined);
  const idOf = (k: string, re: RegExp) => {
    const v = first(k)?.id;
    return typeof v === 'string' && re.test(v) ? v : undefined;
  };
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined);
  // Spotify can list several ids for one artist; the one with the most listeners is the real profile.
  const spotify = Array.isArray(ext.spotify)
    ? [...ext.spotify].sort((x: any, y: any) => (y?.monthly_listeners || 0) - (x?.monthly_listeners || 0))[0]
    : undefined;
  const external = {
    spotifyId: typeof spotify?.id === 'string' && /^[A-Za-z0-9]{22}$/.test(spotify.id) ? spotify.id : undefined,
    netflixId: idOf('netflix', /^\d{4,12}$/),
    imdbId: idOf('imdb', /^(tt|nm)\d{5,10}$/),
    imdbRating: num(first('imdb')?.user_rating),
    letterboxdId: idOf('letterboxd', /^[a-z0-9-]{1,80}$/),
    rottenTomatoes: num(first('rottentomatoes')?.critic_rating),
    metacritic: num(first('metacritic')?.critic_rating)
  };
  const hasExternal = Object.values(external).some((v) => v !== undefined);
  const geo = props.geocode || {};
  const place =
    typeof props.address === 'string' || typeof props.website === 'string'
      ? {
          address: typeof props.address === 'string' ? props.address.slice(0, 200) : undefined,
          website: typeof props.website === 'string' && /^https?:\/\//.test(props.website) ? props.website.slice(0, 300) : undefined,
          neighborhood: typeof props.neighborhood === 'string' ? props.neighborhood : undefined,
          city: typeof geo.city === 'string' ? geo.city : undefined,
          lat: num(e.location?.lat),
          lng: typeof e.location?.lon === 'number' ? e.location.lon : typeof e.location?.lng === 'number' ? e.location.lng : undefined,
          priceLevel: num(props.price_level),
          liveMusic: props.live_music === true
        }
      : undefined;
  const placeImage = Array.isArray(props.images) && typeof props.images[0]?.url === 'string' ? props.images[0].url : undefined;
  return {
    id: String(id),
    name: String(name),
    type,
    year,
    activeFrom: toYear(props.start_year),
    activeTo: toYear(props.end_year),
    image: typeof props.image?.url === 'string' ? props.image.url : placeImage,
    tags: Array.isArray(e.tags) ? e.tags.map((t: any) => t?.name).filter(Boolean) : undefined,
    tagIds: Array.isArray(e.tags)
      ? e.tags.map((t: any) => t?.id || t?.tag_id).filter((t: unknown) => typeof t === 'string' && /^urn:tag:[a-z0-9_:.-]{1,120}$/.test(t)).slice(0, 12)
      : undefined,
    contentRating: typeof props.content_rating === 'string' ? props.content_rating : undefined,
    description: props.short_description || props.description || e.disambiguation || undefined,
    popularity: typeof e.popularity === 'number' ? e.popularity : undefined,
    affinity,
    durationMinutes: duration,
    external: hasExternal ? external : undefined,
    place,
    explain: explain && Object.keys(explain).length ? explain : undefined
  };
}

/** Pull an entity array out of whichever shape the response uses. */
function extractEntities(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw.results)) return raw.results; // /search
  if (Array.isArray(raw.results?.entities)) return raw.results.entities; // /v2/insights
  if (Array.isArray(raw.entities)) return raw.entities;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
}

/** Search Qloo for an entity by name. */
export async function qlooSearch(query: string, type?: string, take = 5): Promise<QlooResult<QlooEntity[]>> {
  const params: Record<string, string> = { query, take: String(take) };
  if (type) params.types = type;
  const res = await qlooGet('/search', params);
  const data = extractEntities(res.raw)
    .map((e) => normaliseEntity(e, type))
    .filter((e): e is QlooEntity => Boolean(e))
    .slice(0, take);
  return { source: res.source, data, capturedAt: res.capturedAt, error: res.error };
}

/**
 * Entities of `targetType` that people with an affinity for `entityId` also like.
 * For films and TV, also sends filter.release_year.max. Qloo silently ignores parameters it
 * doesn't support, so the era guardrail is always applied again after the call.
 */
let yearFilterRejected = false;

export async function qlooRelated(
  entityId: string,
  targetType: string,
  opts: { take?: number; maxYear?: number; explain?: boolean; tags?: string; locationQuery?: string } = {}
): Promise<QlooResult<QlooEntity[]> & { yearFilterApplied: boolean }> {
  const take = opts.take ?? 8;
  const base: Record<string, string> = {
    'filter.type': targetType,
    'signal.interests.entities': entityId,
    take: String(take)
  };
  // Per-result contribution of each input entity (verified on the hackathon API, Oct 2026).
  if (opts.explain) base['feature.explainability'] = 'true';
  if (opts.tags && /^urn:tag:[a-z0-9_:]+$/.test(opts.tags)) base['filter.tags'] = opts.tags;
  if (opts.locationQuery) base['filter.location.query'] = opts.locationQuery.slice(0, 80);

  const yearCapable = targetType === 'urn:entity:movie' || targetType === 'urn:entity:tv_show';
  if (yearCapable && opts.maxYear && !yearFilterRejected) {
    const withYear = { ...base, 'filter.release_year.max': String(opts.maxYear) };
    const res = await qlooGet('/v2/insights', withYear);
    if (res.source !== 'unavailable') {
      const data = extractEntities(res.raw)
        .map((e) => normaliseEntity(e, targetType))
        .filter((e): e is QlooEntity => Boolean(e));
      return { source: res.source, data, capturedAt: res.capturedAt, yearFilterApplied: true };
    }
    // Qloo rejected the year filter: stop sending it and filter by year after the call instead.
    if (res.status === 400) yearFilterRejected = true;
    // Otherwise (no key, timeout) fall through: a saved response without the filter may exist.
  }

  const res = await qlooGet('/v2/insights', base);
  const data = extractEntities(res.raw)
    .map((e) => normaliseEntity(e, targetType))
    .filter((e): e is QlooEntity => Boolean(e));
  return { source: res.source, data, capturedAt: res.capturedAt, error: res.error, yearFilterApplied: false };
}

export interface QlooSharedTag {
  name: string;
  subtype: string;
  score: number;
}

/**
 * Qloo's compare endpoint: the taste tags two sets of entities have in common.
 * GET /v2/insights/compare?a.signal.interests.entities=...&b.signal.interests.entities=...
 */
export async function qlooCompare(aIds: string[], bIds: string[], take = 12): Promise<QlooResult<QlooSharedTag[]>> {
  const params: Record<string, string> = {
    'a.signal.interests.entities': aIds.join(','),
    'b.signal.interests.entities': bIds.join(','),
    take: String(take)
  };
  const res = await qlooGet('/v2/insights/compare', params);
  const tags: any[] = Array.isArray(res.raw?.results?.tags) ? res.raw.results.tags : [];
  const data = tags
    .filter((t) => t && t.name)
    .map((t) => ({ name: String(t.name), subtype: String(t.subtype || ''), score: typeof t.query?.score === 'number' ? t.query.score : 0 }));
  return { source: res.source, data, capturedAt: res.capturedAt, error: res.error };
}

/**
 * Score specific entities against a taste signal: Qloo's affinity of each candidate for people
 * who like `signalIds`. Uses filter.results.entities (verified on the hackathon API, Oct 2026).
 * Returns a map of entity id -> affinity (0-1). Candidates Qloo doesn't score are absent.
 */
/**
 * Qloo affinity of each candidate for one person's favourites. With `bySignalTags`, the signal is
 * the favourites' tags instead of the favourites themselves: Qloo gives no film affinity for a
 * music-only signal (checked on the hackathon API, Oct 2026), but it does for the artist's tags.
 */
export async function qlooScore(
  signalIds: string[],
  targetType: string,
  candidateIds: string[],
  opts: { bySignalTags?: boolean } = {}
): Promise<QlooResult<Record<string, number>>> {
  const ids = Array.from(new Set(candidateIds)).slice(0, 50);
  if (!signalIds.length || !ids.length) return { source: 'unavailable', data: {}, error: 'nothing to score' };
  const res = await qlooGet('/v2/insights', {
    'filter.type': targetType,
    [opts.bySignalTags ? 'signal.interests.tags' : 'signal.interests.entities']: signalIds.join(','),
    'filter.results.entities': ids.join(','),
    take: String(ids.length)
  });
  const data: Record<string, number> = {};
  for (const raw of extractEntities(res.raw)) {
    const e = normaliseEntity(raw, targetType);
    if (e && typeof e.affinity === 'number' && ids.includes(e.id)) data[e.id] = e.affinity;
  }
  return { source: res.source, data, capturedAt: res.capturedAt, error: res.error };
}
