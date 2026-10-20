/** Common Ground: two people, their favourites, and the plans the agent makes for them. */
import type { AgentTraceStep, QlooStatus } from '../types';

export type FavouriteType = 'urn:entity:artist' | 'urn:entity:movie' | 'urn:entity:tv_show';
export type PersonId = 'a' | 'b';

export interface Favourite {
  id: string;
  query: string; // what the person typed
  type: FavouriteType;
  qlooEntityId?: string; // set once matched in Qloo
  qlooName?: string;
  image?: string;
  tags?: string[]; // the entity's own Qloo tags, used to verify shared tags
  unmatched?: boolean; // Qloo found no close match
}

export interface Person {
  id: PersonId;
  name: string; // stays in the app; never sent to Qloo or the LLM
  favourites: Favourite[];
  /** Qloo entities this person loved in earlier plans: they become new signals. */
  liked: { qlooEntityId: string; name: string }[];
}

export type PickKind = 'watch' | 'also' | 'listen' | 'swap';

/** How one person's taste scores a pick: Qloo affinity, and its rank among tonight's candidates. */
export interface PersonFit {
  affinity: number; // Qloo affinity (0-1) for people who like this person's favourites
  rank: number; // 1 = this person's best match among the candidates scored
  /** 0-1 position on this person's own scale (their best candidate = 1, worst = 0). Scale-free, so
   * a favourite whose fans score everything lower can't dominate. */
  norm: number;
}

/** The evidence that a pick suits both people. Every number comes from Qloo. */
export interface PickFit {
  of: number; // how many candidates of this kind were scored
  a?: PersonFit;
  b?: PersonFit;
  jointRank?: number; // position in Qloo's results for both tastes together
  /** Qloo explainability: share of the pick driven by each person's favourites (sums to 1). */
  share?: { a: number; b: number };
}

export interface Pick {
  id: string; // "pick-<qloo id>"
  qlooEntityId: string;
  name: string;
  type: string; // urn:entity:movie | tv_show | artist
  kind: PickKind;
  forWhom: 'both' | PersonId; // whose taste produced it
  /** The planner's one-line note. Written by the AI (or the rules); `fit` holds the Qloo evidence. */
  reason: string;
  year?: number;
  activeFrom?: number;
  image?: string;
  description?: string;
  contentRating?: string;
  affinity?: number;
  durationMinutes?: number;
  fit?: PickFit;
  provenance: 'qloo_live' | 'qloo_saved';
  capturedAt?: string;
  link?: { label: string; url: string };
}

export interface SharedTag {
  name: string;
  subtype: string;
  score: number;
  /** True when both people's own favourites carry this tag in Qloo, not only the compare result. */
  confirmed: boolean;
}

export interface Plan {
  id: string;
  number: number;
  createdAt: string;
  minutes: number;
  commonGround: SharedTag[];
  watch?: Pick;
  alsoWatch: Pick[];
  listen: Pick[];
  swap: { forA?: Pick; forB?: Pick }; // forA: from B's world, picked for A
  why: string[];
  tonight: string;
  trace: AgentTraceStep[];
  planner: 'llm' | 'rules';
  plannerModel?: string;
  qlooStatus: QlooStatus;
  notices: string[];
}

export type Verdict = 'both' | PersonId | 'neither';

export interface PlanFeedback {
  planId: string;
  planNumber: number;
  at: string;
  verdicts: Record<string, Verdict>; // pick id -> verdict
  names: Record<string, string>; // pick id -> pick name
  kinds: Record<string, PickKind>;
}

export interface KindTally {
  tried: number;
  both: number;
  oneOnly: number;
  neither: number;
}

export interface Session {
  id: string;
  isSample?: boolean;
  people: [Person, Person];
  minutes: number;
  exclusions: string[]; // free text, e.g. "horror"
  plans: Plan[]; // newest first
  feedback: PlanFeedback[]; // newest first
  seen: string[]; // Qloo ids already suggested
  rejected: string[]; // Qloo ids neither person liked
  tally: Partial<Record<PickKind, KindTally>>;
}
