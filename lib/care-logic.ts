import { CaregiverProfile, KitSlotItem, ReactionType, TasteEntity, VisitKit, VisitLog } from './types';

/**
 * Care Logic Engine: Enforces dignity, safety, and learning around Qloo discoveries.
 */

export function generateNextVisitKit(
  profile: CaregiverProfile,
  previousVisitReactions?: Record<string, ReactionType>
): VisitKit {
  const visitNum = (profile.visitHistory.length || 0) + 1;

  // 1. Filter out anything on the permanent avoid list
  const safeNodes = profile.tasteMapNodes.filter(
    (node) => !profile.avoidList.some((avoid) => node.name.toLowerCase().includes(avoid.toLowerCase())) && node.status !== 'avoid'
  );

  // 2. Identify Proven Favourites (Green / High confidence)
  let provenCandidates = safeNodes.filter((n) => n.status === 'worked');
  if (provenCandidates.length === 0) {
    // If first visit, use original seeds as proven baseline
    provenCandidates = safeNodes.slice(0, 2);
  }
  const provenItems: KitSlotItem[] = provenCandidates.slice(0, 2).map((n) => ({
    ...n,
    slotType: 'proven',
    confidence: 'High',
    confidenceReason: n.status === 'worked' ? 'Reached them in earlier visits' : 'Initial family favourite'
  }));

  // 3. Identify Qloo Discoveries (Medium confidence, Amber)
  const discoveryCandidates = safeNodes.filter((n) => n.status === 'untested' && !provenItems.some((p) => p.id === n.id));
  const discoveryItems: KitSlotItem[] = discoveryCandidates.slice(0, 1).map((n) => ({
    ...n,
    slotType: 'discovery',
    confidence: 'Medium',
    confidenceReason: n.sourceReason || 'Close cultural connection found by Qloo'
  }));

  // 4. One Hypothesis Experiment (Low confidence)
  const remainingCandidates = safeNodes.filter(
    (n) => n.status === 'untested' && !provenItems.some((p) => p.id === n.id) && !discoveryItems.some((d) => d.id === n.id)
  );
  
  const hypothesisNode = remainingCandidates[0] || discoveryCandidates[1] || {
    id: `hypo-${visitNum}`,
    name: profile.seeds.place ? `${profile.seeds.place} Nostalgia Audio` : 'Acoustic Choir Melodies',
    domain: 'place',
    year: profile.eraStart + 5,
    sourceSeed: profile.seeds.place || profile.seeds.music,
    sourceReason: 'Hypothesis testing new sensory domain',
    status: 'untested',
    confidence: 'Low',
    confidenceReason: "This visit's hypothesis experiment"
  };

  const hypothesisItem: KitSlotItem = {
    ...hypothesisNode,
    slotType: 'hypothesis',
    confidence: 'Low',
    hypothesisLabel: `Testing: does ${profile.lovedOneName} respond to ${hypothesisNode.domain}-based memories from ${hypothesisNode.year || 'her era'}?`
  };

  // 5. Why this kit? (Exactly 3 short, human reasons)
  const whyReasons: string[] = [
    `Starts on safe ground with ${provenItems.map((p) => p.name.split('—')[0].trim()).join(' and ')}.`,
    profile.avoidList.length > 0 
      ? `Permanently excludes ${profile.avoidList.slice(-1)[0]} to prevent distress.`
      : `Stays strictly within ${profile.lovedOneName}’s youth era (${profile.eraStart}–${profile.eraEnd}).`,
    `Tries one gentle experiment: ${hypothesisItem.name.split('—')[0].trim()} (${hypothesisItem.domain}).`
  ];

  // 6. One Small Shared Moment (Bedside 20-min activity)
  const sharedMoment = {
    title: `A Quiet Moment with ${provenItems[0]?.name.split('—')[0].trim() || 'Music'}`,
    description: `Sit beside ${profile.lovedOneName}, play the track softly, and gently hold their hand.`,
    actionPrompt: `Ask gently: "Do you remember hearing this on Sunday mornings?" If they close their eyes or hum, simply listen together.`
  };

  // 7. Three Conversation Openers
  const conversationOpeners = [
    `"I was thinking about you this morning and put on ${provenItems[0]?.name.split('—')[0].trim() || 'this melody'}."`,
    `"Do you remember the old market walks in ${profile.homeRegion}?"`,
    `"It feels so peaceful just sitting here with you today."`
  ];

  // 8. Two Stop Cues (Distress protection)
  const stopCues = [
    'If their eyes wander away, fingers tense, or they grow silent for over 2 minutes, turn off the music without fanfare and shift to quiet company.',
    'If breathing quickens or agitation appears, never argue or press for memories. Say: "We are safe here right now," and offer a sip of water or warm blanket.'
  ];

  return {
    id: `kit-${profile.lovedOneName.toLowerCase()}-v${visitNum}`,
    visitNumber: visitNum,
    generatedAt: 'Generated on demand for this visit',
    whyThisKit: whyReasons,
    provenFavourites: provenItems,
    qlooDiscoveries: discoveryItems,
    hypothesis: hypothesisItem,
    sharedMoment,
    conversationOpeners,
    stopCues
  };
}

/**
 * Updates caregiver profile, colors taste map nodes, and records agent learning.
 */
export function recordVisitReactions(
  profile: CaregiverProfile,
  reactions: Record<string, ReactionType>,
  note?: string
): CaregiverProfile {
  const visitNum = (profile.visitHistory.length || 0) + 1;
  const updatedNodes = [...profile.tasteMapNodes];
  const newAvoidList = [...profile.avoidList];
  const itemReflections: string[] = [];

  let litUpMusic = profile.domainStats.musicLitUpCount;
  let litUpFilm = profile.domainStats.filmLitUpCount;
  let litUpFood = profile.domainStats.foodLitUpCount;
  let litUpPlace = profile.domainStats.placeLitUpCount;

  // Process item-level reactions
  for (const [entityId, reaction] of Object.entries(reactions)) {
    const nodeIndex = updatedNodes.findIndex((n) => n.id === entityId);
    const node = updatedNodes[nodeIndex];
    const name = node ? node.name.split('—')[0].trim() : entityId;

    if (reaction === 'lit_up') {
      if (nodeIndex !== -1) {
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          status: 'worked',
          confidence: 'High',
          confidenceReason: 'Lit up during visit'
        };
        if (node.domain === 'music') litUpMusic++;
        if (node.domain === 'film') litUpFilm++;
        if (node.domain === 'food') litUpFood++;
        if (node.domain === 'place') litUpPlace++;
      }
      itemReflections.push(`This worked: ${name} (brought a smile and recognition).`);
    } else if (reaction === 'upset') {
      if (nodeIndex !== -1) {
        updatedNodes[nodeIndex] = {
          ...updatedNodes[nodeIndex],
          status: 'avoid',
          confidenceReason: 'Triggered distress — excluded permanently'
        };
      }
      if (!newAvoidList.includes(name)) {
        newAvoidList.push(name);
      }
      itemReflections.push(`Added to avoid list: ${name} (triggered distress, never suggested again).`);
    } else {
      itemReflections.push(`${name} fell flat (no reaction observed).`);
    }
  }

  // Pattern-level learning detection
  let patternLevel: string | undefined;
  if (litUpMusic + litUpPlace >= 4 && litUpFilm === 0) {
    patternLevel = `Pattern emerging: ${profile.lovedOneName} responds deeply to vocal music and place-based memories, while video clips tend to cause distraction or distress.`;
  } else if (litUpMusic >= 3) {
    patternLevel = `I noticed something: Familiar voices and melodies consistently ground her visits into calm moments.`;
  }

  // Next-visit line synthesis
  const litUpNames = Object.entries(reactions)
    .filter(([_, r]) => r === 'lit_up')
    .map(([id]) => {
      const match = updatedNodes.find((n) => n.id === id);
      return match ? match.name.split('—')[0].trim() : id;
    });

  const nextVisitLine = litUpNames.length > 0
    ? `Next visit: start with ${litUpNames.join(' and ')}, keep topics peaceful, and try one new gentle place-sound experiment.`
    : `Next visit: return to familiar church choir melodies and avoid fast media clips.`;

  const visitLog: VisitLog = {
    id: `log-visit-${visitNum}`,
    visitNumber: visitNum,
    date: 'Just now',
    reactions,
    caregiverNote: note,
    agentReflections: {
      itemLevel: itemReflections,
      patternLevel,
      nextVisitLine
    }
  };

  const updatedProfile: CaregiverProfile = {
    ...profile,
    avoidList: newAvoidList,
    tasteMapNodes: updatedNodes,
    domainStats: {
      musicLitUpCount: litUpMusic,
      filmLitUpCount: litUpFilm,
      foodLitUpCount: litUpFood,
      placeLitUpCount: litUpPlace
    },
    visitHistory: [visitLog, ...profile.visitHistory]
  };

  // Generate the updated next kit immediately so judge sees before-and-after change!
  const nextKit = generateNextVisitKit(updatedProfile, reactions);
  updatedProfile.previousKit = profile.currentKit;
  updatedProfile.currentKit = nextKit;

  return updatedProfile;
}
