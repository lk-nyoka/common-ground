export type Domain = 'music' | 'film' | 'food' | 'place' | 'activity';

export type NodeStatus = 'worked' | 'untested' | 'avoid'; // green, amber, red

export type ConfidenceTier = 'High' | 'Medium' | 'Low';

export interface TasteEntity {
  id: string;
  name: string;
  domain: Domain;
  year?: number | string;
  sourceSeed?: string; // e.g. "Miriam Makeba"
  sourceReason?: string; // e.g. "Discovered by Qloo from Miriam Makeba"
  status: NodeStatus; // 'worked' = green, 'untested' = amber, 'avoid' = red
  confidence: ConfidenceTier;
  confidenceReason: string; // e.g. "Lit up twice in past visits" or "Close Qloo neighbour"
  mediaLink?: {
    platform: 'spotify' | 'youtube' | 'recipe' | 'photo';
    url: string;
    label: string;
  };
}

export interface KitSlotItem extends TasteEntity {
  slotType: 'proven' | 'discovery' | 'hypothesis';
  hypothesisLabel?: string; // e.g. "Testing: does she respond to place-based memories?"
}

export interface SharedMoment {
  title: string;
  description: string; // Sized for 20 minutes bedside visit
  actionPrompt: string; // "Play Makeba track and ask if she danced to it on Saturday evenings"
}

export interface VisitKit {
  id: string;
  visitNumber: number;
  generatedAt: string;
  whyThisKit: string[]; // Exactly 3 clear reasons
  provenFavourites: KitSlotItem[]; // 2-3 items
  qlooDiscoveries: KitSlotItem[]; // 1-2 items
  hypothesis: KitSlotItem; // 1 labelled experiment
  sharedMoment: SharedMoment; // 1 small activity
  conversationOpeners: string[]; // Exactly 3 openers
  stopCues: string[]; // Exactly 2 distress/pause guidance cues
  reactionsLogged?: boolean;
}

export type ReactionType = 'lit_up' | 'flat' | 'upset';

export interface ItemReaction {
  entityId: string;
  reaction: ReactionType;
  note?: string;
}

export interface VisitLog {
  id: string;
  visitNumber: number;
  date: string;
  reactions: Record<string, ReactionType>;
  caregiverNote?: string;
  agentReflections: {
    itemLevel: string[]; // e.g. "This worked: Miriam Makeba."
    patternLevel?: string; // "I noticed something: She responds most to vocal music and place-based memories."
    nextVisitLine: string; // "Next visit: start with the two songs that reached her..."
  };
}

export interface CaregiverProfile {
  id: string;
  lovedOneName: string; // e.g. "Nomvula"
  birthYear: number; // e.g. 1948
  homeRegion: string; // e.g. "Soweto, Johannesburg"
  eraStart: number; // e.g. 1955
  eraEnd: number; // e.g. 1978
  hobbies: string; // Free text: e.g. "Church choir, vegetable gardening"
  seeds: {
    music: string;
    film?: string;
    food?: string;
    place?: string;
  };
  avoidList: string[]; // Excluded items/topics
  currentKit: VisitKit;
  previousKit?: VisitKit;
  visitHistory: VisitLog[];
  tasteMapNodes: TasteEntity[];
  domainStats: {
    musicLitUpCount: number;
    filmLitUpCount: number;
    foodLitUpCount: number;
    placeLitUpCount: number;
  };
}
