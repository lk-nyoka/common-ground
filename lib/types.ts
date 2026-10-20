export type Domain = 'music' | 'film' | 'tv' | 'food' | 'place' | 'activity';

export type NodeStatus = 'worked' | 'untested' | 'avoid'; // green, amber, red

export type ConfidenceTier = 'High' | 'Medium' | 'Low';

/**
 * Where a piece of data came from. Shown on every node.
 * - family:     typed in by the caregiver (or part of a labelled sample profile)
 * - qloo_live:  returned by a live Qloo API call in this session
 * - qloo_saved: a real Qloo API response captured to data/qloo-fixtures/ earlier
 * There is deliberately no "placeholder" type: if Qloo can't answer, nothing is invented.
 */
export type ProvenanceType = 'family' | 'qloo_live' | 'qloo_saved';

export interface TasteEntity {
  id: string;
  name: string;
  domain: Domain;
  year?: number; // only set when the caregiver or Qloo supplied it
  activeFrom?: number; // artists: first year active, from Qloo
  sourceSeed?: string; // the favourite this was discovered from
  sourceReason?: string;
  status: NodeStatus;
  confidence: ConfidenceTier;
  confidenceReason: string;
  provenance: ProvenanceType;
  qlooEntityId?: string; // Qloo entity_id once resolved
  qlooEntityType?: string; // e.g. "urn:entity:artist"
  qlooQuery?: { query: string; type: string }; // how to resolve a family seed in Qloo
  capturedAt?: string; // for qloo_saved: when the response was captured
  lastLitUpVisit?: number; // most recent visit where it lit them up
  lastTriedVisit?: number; // most recent visit where it was tried at all
  mediaLink?: {
    platform: 'spotify' | 'youtube';
    url: string;
    label: string;
  };
}

export interface KitSlotItem extends TasteEntity {
  slotType: 'proven' | 'discovery' | 'hypothesis';
  hypothesisLabel?: string;
}

export interface SharedMoment {
  title: string;
  description: string;
  actionPrompt: string;
}

export interface AgentTraceStep {
  step: number;
  type: 'thought' | 'tool_call' | 'tool_result' | 'guardrail' | 'synthesis';
  action: string;
  details: string;
  ms?: number; // milliseconds since planning started
}

export type QlooStatus = 'live' | 'saved' | 'not_connected' | 'error';

export interface VisitKit {
  id: string;
  visitNumber: number;
  generatedAt: string;
  whyThisKit: string[];
  provenFavourites: KitSlotItem[];
  qlooDiscoveries: KitSlotItem[];
  hypothesis?: KitSlotItem; // absent when Qloo returned nothing new to test
  sharedMoment: SharedMoment;
  conversationOpeners: string[];
  stopCues: string[];
  reactionsLogged?: boolean;
  agentTrace: AgentTraceStep[];
  planner: 'llm' | 'rules'; // who chose the items: the LLM agent or the fallback rules
  plannerModel?: string;
  qlooStatus: QlooStatus;
  notices: string[]; // honest status lines shown above the kit
}

export type ReactionType = 'lit_up' | 'flat' | 'upset';

export interface VisitLog {
  id: string;
  visitNumber: number;
  date: string;
  isSample?: boolean;
  reactions: Record<string, ReactionType>;
  reactedItems?: Record<string, { name: string; domain: Domain }>;
  caregiverNote?: string;
  goodMoments?: number; // items that lit them up in this visit
  agentReflections: {
    itemLevel: string[];
    patternLevel?: string;
    experimentResult?: string; // the answer to the kit's labelled experiment, if it was tried
    nextVisitLine: string;
  };
}

export interface DomainTally {
  tried: number;
  litUp: number;
  upset: number;
}

export type DomainStats = Partial<Record<Domain, DomainTally>>;

export interface CaregiverProfile {
  id: string;
  isSample?: boolean;
  lovedOneName: string; // never sent to Qloo or the LLM
  birthYear: number; // never sent; only the derived era range is
  homeRegion: string;
  eraStart: number;
  eraEnd: number;
  hobbies: string;
  seeds: {
    music: string;
    film?: string;
    food?: string;
    place?: string;
  };
  avoidList: string[];
  currentKit?: VisitKit;
  previousKit?: VisitKit;
  visitHistory: VisitLog[];
  tasteMapNodes: TasteEntity[];
  domainStats: DomainStats;
}

/** A Qloo entity, normalised from the raw API response. */
export interface QlooEntity {
  id: string;
  name: string;
  type: string;
  year?: number; // release year (films, TV)
  activeFrom?: number; // first year active (artists), from Qloo's start_year
  activeTo?: number;
  image?: string; // Qloo artwork URL
  tags?: string[]; // tag names on the entity (search results include these)
  contentRating?: string;
  description?: string;
  popularity?: number;
  affinity?: number;
  durationMinutes?: number; // films: running time; TV: typical episode length
  /** With feature.explainability: how much each input entity contributed to this result (sums to ~1). */
  explain?: Record<string, number>;
}

export interface QlooResult<T> {
  source: 'live' | 'saved' | 'unavailable';
  data: T;
  capturedAt?: string;
  error?: string;
}
