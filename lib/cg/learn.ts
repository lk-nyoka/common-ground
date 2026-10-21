/** Learning from both people's reactions. Pure: safe on client or server. */
import type { KindTally, Pick, PickKind, PlanFeedback, Session, Verdict } from './types';

export function picksOf(plan: Session['plans'][number]): Pick[] {
  return [plan.watch, ...plan.alsoWatch, ...plan.listen, plan.swap.forA, plan.swap.forB, ...(plan.local || []), ...(plan.comedy || [])].filter(Boolean) as Pick[];
}

/**
 * Record verdicts on the latest plan.
 * both -> a signal for both people; one person -> a signal for that person;
 * neither -> never suggested again.
 */
export function applyFeedback(input: Session, verdicts: Record<string, Verdict>): Session {
  const session: Session = JSON.parse(JSON.stringify(input));
  const plan = session.plans[0];
  if (!plan) return session;
  const [A, B] = session.people;
  const names: Record<string, string> = {};
  const kinds: Record<string, PickKind> = {};
  const tally = session.tally;

  for (const p of picksOf(plan)) {
    const v = verdicts[p.id];
    if (!v) continue;
    names[p.id] = p.name;
    kinds[p.id] = p.kind;
    const t: KindTally = { ...(tally[p.kind] || { tried: 0, both: 0, oneOnly: 0, neither: 0 }) };
    t.tried += 1;
    const signal = { qlooEntityId: p.qlooEntityId, name: p.name };
    if (v === 'both') {
      t.both += 1;
      if (!A.liked.some((l) => l.qlooEntityId === p.qlooEntityId)) A.liked.push(signal);
      if (!B.liked.some((l) => l.qlooEntityId === p.qlooEntityId)) B.liked.push(signal);
    } else if (v === 'a' || v === 'b') {
      t.oneOnly += 1;
      const who = v === 'a' ? A : B;
      if (!who.liked.some((l) => l.qlooEntityId === p.qlooEntityId)) who.liked.push(signal);
    } else {
      t.neither += 1;
      if (!session.rejected.includes(p.qlooEntityId)) session.rejected.push(p.qlooEntityId);
    }
    tally[p.kind] = t;
  }

  const fb: PlanFeedback = { planId: plan.id, planNumber: plan.number, at: new Date().toISOString(), verdicts, names, kinds };
  session.feedback = [fb, ...session.feedback];
  return session;
}

/** Shared hit rate: of everything tried, how much did BOTH people love? Counted, not estimated. */
export function sharedHitRate(session: Session): { both: number; tried: number } {
  let both = 0;
  let tried = 0;
  for (const t of Object.values(session.tally)) {
    if (!t) continue;
    both += t.both;
    tried += t.tried;
  }
  return { both, tried };
}

export function summarise(session: Session) {
  const fb = session.feedback[0];
  if (!fb) return null;
  const [A, B] = session.people;
  const by = (v: Verdict) => Object.entries(fb.verdicts).filter(([, x]) => x === v).map(([id]) => fb.names[id]);
  return { both: by('both'), onlyA: by('a'), onlyB: by('b'), neither: by('neither'), aName: A.name, bName: B.name };
}
