/** Name matching shared by the planner and the setup form, so "Found in Qloo" means the same in both. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Does a Qloo result fit what someone typed? Exactly, or the result's name contains what they typed
 * ("weeknd" → "The Weeknd"). Never the other way round: "Kelvin Momo" must not fit "Momo".
 */
export function nameFits(candidate: string, query: string): boolean {
  const c = fold(candidate);
  const q = fold(query);
  if (!c || !q) return false;
  if (c === q) return true;
  return q.length >= 4 && (` ${c} `).includes(` ${q} `);
}

/** The best match for what someone typed: an exact name first, then one that contains it, in Qloo's order. */
export function bestMatch<T extends { name: string }>(list: T[], query: string): T | undefined {
  const q = fold(query);
  return list.find((e) => fold(e.name) === q) || list.find((e) => nameFits(e.name, query));
}

export function namesMatch(a: string, b: string): boolean {
  const x = fold(a);
  const y = fold(b);
  return x === y || (x.length >= 4 && y.includes(x)) || (y.length >= 4 && x.includes(y));
}
