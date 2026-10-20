/**
 * Care logic: the rules Gentle visit applies around whatever Qloo returns.
 * Pure functions, safe on client or server. No invented content: every item in a kit
 * is either a family memory or a Qloo result, and every sentence is built from real data.
 */
import {
  AgentTraceStep,
  CaregiverProfile,
  Domain,
  DomainStats,
  KitSlotItem,
  QlooStatus,
  ReactionType,
  SharedMoment,
  TasteEntity,
  VisitKit,
  VisitLog
} from './types';

export const DOMAIN_LABEL: Record<Domain, string> = {
  music: 'music',
  film: 'films',
  tv: 'TV',
  food: 'food',
  place: 'places',
  activity: 'activities'
};

export function domainFromQlooType(type?: string): Domain {
  if (!type) return 'music';
  if (type.includes('artist') || type.includes('album') || type.includes('song')) return 'music';
  if (type.includes('movie')) return 'film';
  if (type.includes('tv_show')) return 'tv';
  if (type.includes('place') || type.includes('destination') || type.includes('locality')) return 'place';
  return 'activity';
}

export function shortName(name: string): string {
  return name.split('—')[0].trim();
}

/** Lower-case and strip accents, so "Mañana" matches "manana" on the avoid list. */
export function foldText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** A Qloo discovery whose era couldn't be checked (Qloo gives no year for artists). */
export function eraUnchecked(n: TasteEntity): boolean {
  return n.provenance !== 'family' && !n.year && !n.activeFrom;
}

/** True when an item matches anything on the avoid list (or is itself marked avoid). */
export function isAvoided(profile: CaregiverProfile, name: string, qlooEntityId?: string): boolean {
  const lower = foldText(name);
  const textHit = profile.avoidList.some((a) => {
    const av = foldText(a);
    if (av.length < 4) return false;
    return lower.includes(av) || (lower.length >= 4 && av.includes(lower));
  });
  const nodeHit = profile.tasteMapNodes.some(
    (n) =>
      n.status === 'avoid' &&
      ((qlooEntityId && n.qlooEntityId === qlooEntityId) || foldText(n.name) === lower)
  );
  return textHit || nodeHit;
}

export function tally(stats: DomainStats, d: Domain) {
  return stats[d] || { tried: 0, litUp: 0, upset: 0 };
}

/** Domains we should not experiment with: tried, never lit up, and caused upset. */
export function domainsToRest(stats: DomainStats): Domain[] {
  return (Object.keys(stats) as Domain[]).filter((d) => {
    const t = tally(stats, d);
    return t.upset > 0 && t.litUp === 0;
  });
}

/** Lit-up rate per domain, highest first; only domains tried at least once. */
export function domainRanking(stats: DomainStats): Domain[] {
  return (Object.keys(stats) as Domain[])
    .filter((d) => tally(stats, d).tried > 0)
    .sort((a, b) => {
      const ta = tally(stats, a);
      const tb = tally(stats, b);
      return tb.litUp / tb.tried - ta.litUp / ta.tried;
    });
}

export function mediaLinkFor(name: string, domain: Domain): TasteEntity['mediaLink'] {
  if (domain === 'music') {
    return { platform: 'spotify', url: `https://open.spotify.com/search/${encodeURIComponent(name)}`, label: 'Search on Spotify' };
  }
  if (domain === 'food' || domain === 'activity') return undefined;
  return {
    platform: 'youtube',
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(name)}`,
    label: 'Search on YouTube'
  };
}

const STOP_CUES = [
  'If they look away, tense up, or go quiet for a couple of minutes, stop the music or clip without comment and just sit together.',
  "If they seem distressed, don't press for memories. Switch to calm, familiar company: a hand to hold, a sip of water, a quiet voice."
];

function defaultSharedMoment(name: string, proven: KitSlotItem[], hobbies: string): SharedMoment {
  const first = proven[0];
  if (!first) {
    return {
      title: 'Quiet company',
      description: `Sit with ${name} for a few minutes before trying anything from the kit.`,
      actionPrompt: 'Let them set the pace. Follow whatever they bring up.'
    };
  }
  const item = shortName(first.name);
  if (first.domain === 'music') {
    return {
      title: `Listening to ${item} together`,
      description: `Play one ${item} song softly. A few minutes is enough.`,
      actionPrompt: `Ask ${name}, gently and only once: "Where were you when you used to hear this?"`
    };
  }
  if (first.domain === 'food') {
    return {
      title: `A small taste of ${item}`,
      description: `If it's safe for ${name} to eat, bring a small taste of ${item}.`,
      actionPrompt: `Ask: "Who used to make this?" and let the story go wherever it goes.`
    };
  }
  if (first.domain === 'place') {
    return {
      title: `Looking back at ${item}`,
      description: `Look at one or two old photos of ${item} together.`,
      actionPrompt: `Ask: "What were weekends like there?"${hobbies ? ` (Their hobbies: ${hobbies}.)` : ''}`
    };
  }
  return {
    title: `Watching a moment of ${item}`,
    description: `Play a short clip of ${item}, two or three minutes at most.`,
    actionPrompt: 'Ask which part they remember best.'
  };
}

function defaultOpeners(name: string, proven: KitSlotItem[], discoveries: KitSlotItem[]): string[] {
  const openers: string[] = [];
  const p0 = proven[0] ? shortName(proven[0].name) : undefined;
  const p1 = proven[1] ? shortName(proven[1].name) : undefined;
  const d0 = discoveries[0] ? shortName(discoveries[0].name) : undefined;
  if (p0) openers.push(`"${name}, I put on ${p0} this morning and thought of you."`);
  if (p1) openers.push(`"Do you remember ${p1}?"`);
  if (d0) {
    const dom = discoveries[0].domain;
    openers.push(
      dom === 'music'
        ? `"I found some music by ${d0}. Shall we listen to a little together?"`
        : dom === 'film' || dom === 'tv'
        ? `"I found ${d0}. Shall we watch a little together?"`
        : `"I found something about ${d0}. Shall we have a look?"`
    );
  }
  openers.push('"It\'s nice just sitting here with you today."');
  return openers.slice(0, 3);
}

export interface KitInputs {
  profile: CaregiverProfile;
  candidates: TasteEntity[]; // untested Qloo items eligible for this kit (already era- and avoid-filtered)
  picks?: { discoveryIds: string[]; hypothesisId?: string; hypothesisTests?: string };
  writing?: { why?: string[]; openers?: string[]; sharedMoment?: SharedMoment };
  trace: AgentTraceStep[];
  planner: 'llm' | 'rules';
  plannerModel?: string;
  qlooStatus: QlooStatus;
  notices: string[];
}

/** Assemble the visit kit: mostly familiar, a little new, never anything avoided. */
export function assembleKit(input: KitInputs): VisitKit {
  const { profile, candidates } = input;
  const name = profile.lovedOneName;
  const visitNum = profile.visitHistory.length + 1;

  // 1. Proven favourites: things that have reached them (or the family's seeds on a first visit).
  const worked = profile.tasteMapNodes.filter((n) => n.status === 'worked' && !isAvoided(profile, n.name, n.qlooEntityId));
  // What lit them up most recently leads; untried family favourites follow in the family's order.
  const provenSorted = [...worked].sort((a, b) => (b.lastLitUpVisit || 0) - (a.lastLitUpVisit || 0));
  const proven: KitSlotItem[] = provenSorted.slice(0, 2).map((n) => ({ ...n, slotType: 'proven', confidence: 'High' }));

  // 2. Qloo discoveries and one hypothesis, from real Qloo candidates only.
  // Something that fell flat last visit gets a rest before it is tried again.
  const lastVisit = profile.visitHistory.length;
  const pool = candidates.filter((c) => !proven.some((p) => p.id === c.id) && !(c.lastTriedVisit && c.lastTriedVisit >= lastVisit));
  const byId = new Map(pool.map((c) => [c.id, c]));
  const rest = domainsToRest(profile.domainStats);

  let discoveryNodes: TasteEntity[] = [];
  let hypothesisNode: TasteEntity | undefined;
  let hypothesisTests: string | undefined;

  if (input.picks) {
    discoveryNodes = input.picks.discoveryIds.map((id) => byId.get(id)).filter((n): n is TasteEntity => Boolean(n)).slice(0, 2);
    const h = input.picks.hypothesisId ? byId.get(input.picks.hypothesisId) : undefined;
    if (h && !discoveryNodes.some((d) => d.id === h.id)) {
      hypothesisNode = h;
      hypothesisTests = input.picks.hypothesisTests;
    }
  }

  if (discoveryNodes.length === 0) {
    // Rules: prefer domains that have worked, from seeds that have worked, in Qloo's own order.
    const ranking = domainRanking(profile.domainStats);
    const score = (c: TasteEntity) => {
      const r = ranking.indexOf(c.domain);
      return r === -1 ? ranking.length : r;
    };
    const sorted = [...pool].filter((c) => !rest.includes(c.domain)).sort((a, b) => score(a) - score(b));
    discoveryNodes = sorted.slice(0, sorted.length >= 3 ? 2 : 1);
  }

  if (!hypothesisNode) {
    const remaining = pool.filter((c) => !discoveryNodes.some((d) => d.id === c.id) && !rest.includes(c.domain));
    const usedDomains = new Set([...proven, ...discoveryNodes].map((n) => n.domain));
    hypothesisNode = remaining.find((c) => !usedDomains.has(c.domain)) || remaining[0];
  }

  const discoveries: KitSlotItem[] = discoveryNodes.map((n) => ({
    ...n,
    slotType: 'discovery',
    confidence: 'Medium',
    confidenceReason: n.sourceSeed ? `Qloo neighbour of ${shortName(n.sourceSeed)}, which has reached them` : 'Qloo neighbour'
  }));

  const hypothesis: KitSlotItem | undefined = hypothesisNode
    ? {
        ...hypothesisNode,
        slotType: 'hypothesis',
        confidence: 'Low',
        confidenceReason: "This visit's experiment: untested",
        hypothesisLabel:
          hypothesisTests ||
          `Testing: does ${name} respond to ${DOMAIN_LABEL[hypothesisNode.domain]} linked to ${
            hypothesisNode.sourceSeed ? shortName(hypothesisNode.sourceSeed) : 'their favourites'
          }?`
      }
    : undefined;

  // 3. Why this kit: three reasons, each true of this kit.
  const why: string[] = [];
  if (proven.length) {
    why.push(
      `Starts on safe ground with ${proven.map((p) => shortName(p.name)).join(' and ')}${
        visitNum === 1 ? ' (family favourites).' : ', which have reached them before.'
      }`
    );
  }
  const avoidCount = profile.avoidList.length + profile.tasteMapNodes.filter((n) => n.status === 'avoid').length;
  if (avoidCount > 0) {
    why.push(`Leaves out everything on the avoid list${rest.length ? ` and rests ${rest.map((d) => DOMAIN_LABEL[d]).join(', ')} after an upset` : ''}.`);
  } else {
    why.push(`Keeps new items within ${name}'s era (${profile.eraStart}–${profile.eraEnd}) wherever Qloo gives a year.`);
  }
  if (hypothesis) {
    why.push(`Tries one new thing: ${shortName(hypothesis.name)}, found by Qloo from ${hypothesis.sourceSeed ? shortName(hypothesis.sourceSeed) : 'their favourites'}.`);
  } else if (discoveries.length) {
    why.push(`Adds ${shortName(discoveries[0].name)}, a Qloo discovery, as the only new item.`);
  } else if (input.qlooStatus === 'not_connected') {
    why.push("No new items yet: Qloo isn't connected, so the kit stays with the family's favourites.");
  } else {
    why.push('No new items this time: Qloo had nothing that passed the era and avoid-list checks.');
  }

  const writing = input.writing || {};
  const conversationOpeners =
    writing.openers && writing.openers.length === 3 ? writing.openers : defaultOpeners(name, proven, discoveries);

  return {
    id: `kit-${profile.id}-v${visitNum}-${Date.now()}`,
    visitNumber: visitNum,
    generatedAt: new Date().toISOString(),
    whyThisKit: writing.why && writing.why.length === 3 ? writing.why : why.slice(0, 3),
    provenFavourites: proven,
    qlooDiscoveries: discoveries,
    hypothesis,
    sharedMoment: writing.sharedMoment || defaultSharedMoment(name, proven, profile.hobbies),
    conversationOpeners,
    stopCues: STOP_CUES,
    agentTrace: input.trace,
    planner: input.planner,
    plannerModel: input.plannerModel,
    qlooStatus: input.qlooStatus,
    notices: input.notices
  };
}

/** Pattern line built only from logged counts. Returns undefined until there is enough data. */
export function describePattern(name: string, stats: DomainStats): string | undefined {
  const domains = (Object.keys(stats) as Domain[]).filter((d) => tally(stats, d).tried >= 2);
  if (domains.length === 0) return undefined;
  const parts = domains
    .map((d) => {
      const t = tally(stats, d);
      if (t.litUp === 0) return `${DOMAIN_LABEL[d]} haven't landed yet (0 of ${t.tried}${t.upset ? `, ${t.upset} upset` : ''})`;
      return `${DOMAIN_LABEL[d]} reached ${name} in ${t.litUp} of ${t.tried} tries`;
    })
    .join('; ');
  return `Pattern so far: ${parts}.`;
}

/**
 * Record one visit's reactions: recolour the map, update the avoid list and the per-domain
 * tallies, and write item-level reflections. The next kit is planned separately by the agent.
 */
export function recordVisitReactions(
  profile: CaregiverProfile,
  reactions: Record<string, ReactionType>,
  note?: string
): CaregiverProfile {
  const visitNum = profile.visitHistory.length + 1;
  const nodes = profile.tasteMapNodes.map((n) => ({ ...n }));
  const avoidList = [...profile.avoidList];
  const stats: DomainStats = JSON.parse(JSON.stringify(profile.domainStats || {}));
  const itemLevel: string[] = [];
  const reactedItems: VisitLog['reactedItems'] = {};

  for (const [id, reaction] of Object.entries(reactions)) {
    const node = nodes.find((n) => n.id === id);
    if (!node) continue;
    const label = shortName(node.name);
    reactedItems[id] = { name: label, domain: node.domain };
    const t = { ...tally(stats, node.domain) };
    t.tried += 1;
    node.lastTriedVisit = visitNum;

    if (reaction === 'lit_up') {
      t.litUp += 1;
      node.status = 'worked';
      node.confidence = 'High';
      node.confidenceReason = `Lit up in visit ${visitNum}`;
      node.lastLitUpVisit = visitNum;
      itemLevel.push(`This worked: ${label}.`);
    } else if (reaction === 'upset') {
      t.upset += 1;
      node.status = 'avoid';
      node.confidenceReason = `Upset them in visit ${visitNum}; never suggested again`;
      if (!avoidList.includes(label)) avoidList.push(label);
      itemLevel.push(`Added to the avoid list: ${label}.`);
    } else {
      node.confidenceReason = `No reaction in visit ${visitNum}`;
      itemLevel.push(`${label} fell flat this time.`);
    }
    stats[node.domain] = t;
  }

  // Answer the experiment this kit set out to test, if it was tried.
  const hyp = profile.currentKit?.hypothesis;
  let experimentResult: string | undefined;
  if (hyp && reactions[hyp.id]) {
    const raw = (hyp.hypothesisLabel || `does ${profile.lovedOneName} respond to ${shortName(hyp.name)}?`).replace(/^Testing:\s*/i, '');
    const label = raw.charAt(0).toUpperCase() + raw.slice(1);
    const r = reactions[hyp.id];
    experimentResult =
      r === 'lit_up'
        ? `Experiment: ${label} Yes, this time: ${shortName(hyp.name)} lit them up. It becomes a new starting point.`
        : r === 'upset'
        ? `Experiment: ${label} No: ${shortName(hyp.name)} upset them. It won't be suggested again.`
        : `Experiment: ${label} Not this time: ${shortName(hyp.name)} fell flat. It rests for a visit.`;
  }

  const log: VisitLog = {
    id: `log-${profile.id}-${visitNum}-${Date.now()}`,
    visitNumber: visitNum,
    date: new Date().toISOString(),
    reactions,
    reactedItems,
    caregiverNote: note,
    goodMoments: Object.values(reactions).filter((r) => r === 'lit_up').length,
    agentReflections: {
      itemLevel,
      patternLevel: describePattern(profile.lovedOneName, stats),
      experimentResult,
      nextVisitLine: '' // filled in once the next kit exists
    }
  };

  return {
    ...profile,
    tasteMapNodes: nodes,
    avoidList,
    domainStats: stats,
    visitHistory: [log, ...profile.visitHistory],
    previousKit: profile.currentKit ? { ...profile.currentKit, reactionsLogged: true } : undefined
  };
}

/** The plain-language next-visit line, built from the kit that was actually produced. */
export function nextVisitLine(kit: VisitKit, newlyAvoided: string[]): string {
  const start = kit.provenFavourites.map((p) => shortName(p.name));
  const parts: string[] = [];
  if (start.length) parts.push(`start with ${start.join(' and ')}`);
  if (newlyAvoided.length) parts.push(`leave out ${newlyAvoided.join(' and ')}`);
  if (kit.hypothesis) parts.push(`try one new thing: ${shortName(kit.hypothesis.name)}`);
  else if (kit.qlooDiscoveries[0]) parts.push(`try ${shortName(kit.qlooDiscoveries[0].name)}`);
  if (parts.length === 0) return 'Next visit: keep it simple and familiar.';
  const sentence = parts.length > 1 ? `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}` : parts[0];
  return `Next visit: ${sentence}.`;
}
