/** Name matching shared by the planner and the setup form, so "Found in Qloo" means the same in both. */
export function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function namesMatch(a: string, b: string): boolean {
  const x = fold(a);
  const y = fold(b);
  return x === y || (x.length >= 4 && y.includes(x)) || (y.length >= 4 && x.includes(y));
}
