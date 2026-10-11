import { CaregiverProfile, TasteEntity, VisitKit } from './types';

// ============================================================================
// PROFILE 1: Nomvula, born 1948, Soweto (Lead Profile)
// Seeds: Miriam Makeba, Come Back, Africa, Umngqusho, Sophiatown
// Era Guardrail: 1955 - 1978 (Ages 12 - 30)
// ============================================================================

export const NOMVULA_NODES: TasteEntity[] = [
  // Center seeds & Proven (Green)
  {
    id: 'makeba',
    name: 'Miriam Makeba — "Lakutshn, Ilanga" & "Pata Pata"',
    domain: 'music',
    year: 1957,
    sourceSeed: 'Miriam Makeba',
    sourceReason: 'Original family memory (confirmed as musician urn:entity:artist)',
    status: 'worked',
    confidence: 'High',
    confidenceReason: 'Lit up twice in sample history visits',
    provenance: 'qloo_saved',
    qlooEntityType: 'urn:entity:artist',
    mediaLink: {
      platform: 'youtube',
      url: 'https://www.youtube.com/results?search_query=miriam+makeba+lakutshn+ilanga',
      label: 'Listen on YouTube'
    }
  },
  {
    id: 'umngqusho',
    name: 'Umngqusho (Samp & Sugar Beans Home Cooking Aroma)',
    domain: 'food',
    year: 1955,
    sourceSeed: 'Umngqusho',
    sourceReason: 'Original family memory of comfort dish',
    status: 'worked',
    confidence: 'High',
    confidenceReason: 'Smiled and recalled mother preparing it in sample visit',
    provenance: 'placeholder',
    mediaLink: {
      platform: 'youtube',
      url: 'https://www.youtube.com/results?search_query=how+to+cook+umngqusho+traditional',
      label: 'Watch Recipe Prep on YouTube'
    }
  },
  {
    id: 'sophiatown_photos',
    name: 'Old Sophiatown Street Life & Market Photos',
    domain: 'place',
    year: 1955,
    sourceSeed: 'Sophiatown',
    sourceReason: 'Original family memory (confirmed as locality urn:entity:place)',
    status: 'worked',
    confidence: 'High',
    confidenceReason: 'Kept her talking for 15 minutes about Sunday walks in sample visit',
    provenance: 'qloo_saved',
    qlooEntityType: 'urn:entity:place',
    mediaLink: {
      platform: 'youtube',
      url: 'https://www.youtube.com/results?search_query=sophiatown+1950s+archive+documentary',
      label: 'View Archival Footage on YouTube'
    }
  },

  // Qloo Discoveries (Amber - Untested)
  {
    id: 'dorothy_masuka',
    name: 'Dorothy Masuka — "Hamba Nontsokolo"',
    domain: 'music',
    year: 1956,
    sourceSeed: 'Miriam Makeba',
    sourceReason: 'People with affinity for Miriam Makeba often connect with Dorothy Masuka (contemporary Soweto vocal jazz)',
    status: 'untested',
    confidence: 'Medium',
    confidenceReason: 'Close Qloo affinity cluster neighbour',
    provenance: 'qloo_saved',
    qlooEntityType: 'urn:entity:artist',
    mediaLink: {
      platform: 'spotify',
      url: 'https://open.spotify.com/search/dorothy%20masuka%20hamba%20nontsokolo',
      label: 'Play on Spotify'
    }
  },
  {
    id: 'manhattan_brothers',
    name: 'The Manhattan Brothers — Vocal Harmonies',
    domain: 'music',
    year: 1954,
    sourceSeed: 'Miriam Makeba',
    sourceReason: 'People with affinity for Miriam Makeba often connect with The Manhattan Brothers (early vocal group collaboration)',
    status: 'untested',
    confidence: 'Medium',
    confidenceReason: 'Historical Soweto vocal harmony cluster',
    provenance: 'qloo_saved',
    qlooEntityType: 'urn:entity:artist',
    mediaLink: {
      platform: 'youtube',
      url: 'https://www.youtube.com/results?search_query=the+manhattan+brothers+south+africa',
      label: 'Listen on YouTube'
    }
  },
  {
    id: 'spokes_mashiyane',
    name: 'Spokes Mashiyane — Pennywhistle Kwela',
    domain: 'music',
    year: 1958,
    sourceSeed: 'Sophiatown',
    sourceReason: 'People connected to Sophiatown often associate with Spokes Mashiyane pennywhistle jazz',
    status: 'untested',
    confidence: 'Low',
    confidenceReason: 'This visit’s hypothesis experiment',
    provenance: 'qloo_saved',
    qlooEntityType: 'urn:entity:artist',
    mediaLink: {
      platform: 'youtube',
      url: 'https://www.youtube.com/results?search_query=spokes+mashiyane+pennywhistle',
      label: 'Listen on YouTube'
    }
  },

  // Avoid item (Red)
  {
    id: 'come_back_africa_film',
    name: 'Film: "Come Back, Africa" (Police Raid Scene Clip)',
    domain: 'film',
    year: 1959,
    sourceSeed: 'Come Back, Africa',
    sourceReason: 'Original family seed (confirmed as urn:entity:movie)',
    status: 'avoid',
    confidence: 'High',
    confidenceReason: 'Marked UPSET in sample visit 2 — siren and police raid caused agitation',
    provenance: 'qloo_saved',
    qlooEntityType: 'urn:entity:movie'
  }
];

export const NOMVULA_KIT: VisitKit = {
  id: 'kit-nomvula-v4',
  visitNumber: 4,
  generatedAt: 'Today, 20 minutes before visit',
  whyThisKit: [
    'Builds on the two songs and market memories that reached Nomvula in earlier visits.',
    'Excludes historical film clips that previously triggered distress (sirens/raids).',
    'Tries one gentle place-sound experiment: Spokes Mashiyane pennywhistle kwela from old Sophiatown.'
  ],
  provenFavourites: [
    {
      ...NOMVULA_NODES[0], // Makeba
      slotType: 'proven'
    },
    {
      ...NOMVULA_NODES[2], // Sophiatown photos
      slotType: 'proven'
    }
  ],
  qlooDiscoveries: [
    {
      ...NOMVULA_NODES[3], // Dorothy Masuka
      slotType: 'discovery'
    }
  ],
  hypothesis: {
    ...NOMVULA_NODES[5], // Spokes Mashiyane
    slotType: 'hypothesis',
    hypothesisLabel: 'Testing: does she respond to Sophiatown kwela pennywhistle rhythms without singing?'
  },
  sharedMoment: {
    title: 'The Sunday Afternoon Walk Memory',
    description: 'Look through two archival photos of Sophiatown market while playing Dorothy Masuka softly.',
    actionPrompt: 'Ask her: "Did the choir ladies dress in yellow or blue for Sunday morning church in Sophiatown?"'
  },
  conversationOpeners: [
    '"Mom, I heard this Miriam Makeba song this morning and thought of your warm Sunday tea."',
    '"Look at this old photo of the street market in Sophiatown — remember the bakery on the corner?"',
    '"Do you remember who could sing the lowest bass notes in the community choir?"'
  ],
  stopCues: [
    'If she looks away, stops tapping her fingers, or becomes quiet for more than 2 minutes, pause the audio gently without drawing attention.',
    'If her brow furrows or breathing speeds up, switch from questions to quiet presence: hold her hand and mention a peaceful familiar memory.'
  ]
};

export const SAMPLE_NOMVULA_PROFILE: CaregiverProfile = {
  id: 'profile-nomvula',
  lovedOneName: 'Nomvula',
  birthYear: 1948,
  homeRegion: 'Soweto, Johannesburg',
  eraStart: 1955,
  eraEnd: 1978,
  hobbies: 'Church choir, tea on the porch, vegetable gardening',
  seeds: {
    music: 'Miriam Makeba',
    film: 'Come Back, Africa',
    food: 'Umngqusho',
    place: 'Sophiatown'
  },
  confirmedEntities: {
    'Miriam Makeba': {
      id: 'makeba-art-01',
      name: 'Miriam Makeba',
      type: 'urn:entity:artist',
      description: 'South African singer, songwriter, and civil rights activist'
    },
    'Come Back, Africa': {
      id: 'cba-mov-01',
      name: 'Come Back, Africa',
      type: 'urn:entity:movie',
      description: '1959 drama film directed by Lionel Rogosin set in Sophiatown'
    },
    'Sophiatown': {
      id: 'soph-loc-01',
      name: 'Sophiatown',
      type: 'urn:entity:place',
      description: 'Historic Johannesburg suburb renowned for mid-century jazz culture'
    }
  },
  avoidList: ['Police raid clips from Come Back, Africa', 'Loud sirens', '1970s hard rock'],
  currentKit: NOMVULA_KIT,
  tasteMapNodes: NOMVULA_NODES,
  domainStats: {
    musicLitUpCount: 4,
    filmLitUpCount: 0,
    foodLitUpCount: 2,
    placeLitUpCount: 3
  },
  visitHistory: [
    {
      id: 'log-1',
      visitNumber: 1,
      date: 'Sample history (Visit 1)',
      reactions: {
        makeba: 'lit_up',
        umngqusho: 'lit_up'
      },
      agentReflections: {
        itemLevel: ['This worked: Miriam Makeba (hummed along immediately in sample visit).'],
        nextVisitLine: 'Next visit: Keep vocal music front and center, add place memories from Sophiatown.'
      }
    },
    {
      id: 'log-2',
      visitNumber: 2,
      date: 'Sample history (Visit 2)',
      reactions: {
        come_back_africa_film: 'upset',
        sophiatown_photos: 'lit_up'
      },
      agentReflections: {
        itemLevel: [
          'This worked: Sophiatown market photos (talked about Sunday walks).',
          'Avoid list added: "Come Back, Africa" raid scene triggered distress.'
        ],
        patternLevel: 'Pattern emerging: Screen-based video causes tension; still photos and music create calm connection.',
        nextVisitLine: 'Next visit: Exclude all film clips; expand vocal music neighbours and place-based tactile memories.'
      }
    },
    {
      id: 'log-3',
      visitNumber: 3,
      date: 'Sample history (Visit 3)',
      reactions: {
        makeba: 'lit_up',
        sophiatown_photos: 'lit_up'
      },
      agentReflections: {
        itemLevel: ['This worked: Makeba and Sophiatown photos once again reached her.'],
        patternLevel: 'I noticed something: She responds most deeply to vocal harmonies and place-based community memories.',
        nextVisitLine: 'Next visit: Start with Makeba and Sophiatown, test Dorothy Masuka and one pennywhistle experiment.'
      }
    }
  ]
};

// ============================================================================
// PROFILE 2: Dorothy, born 1946, Ohio (Backup Lead Profile)
// Seeds: Patsy Cline, The Sound of Music, Apple Pie, Lake Erie
// Era Guardrail: 1955 - 1975 (Ages 12 - 29)
// ============================================================================

export const DOROTHY_NODES: TasteEntity[] = [
  {
    id: 'patsy_cline',
    name: 'Patsy Cline — "Crazy" & "Walkin\' After Midnight"',
    domain: 'music',
    year: 1961,
    sourceSeed: 'Patsy Cline',
    sourceReason: 'Original family memory (confirmed as musician urn:entity:artist)',
    status: 'worked',
    confidence: 'High',
    confidenceReason: 'Baseline family favourite',
    provenance: 'qloo_saved',
    qlooEntityType: 'urn:entity:artist',
    mediaLink: {
      platform: 'spotify',
      url: 'https://open.spotify.com/search/patsy%20cline%20crazy',
      label: 'Play on Spotify'
    }
  },
  {
    id: 'sound_of_music',
    name: '"Edelweiss" from The Sound of Music',
    domain: 'music',
    year: 1965,
    sourceSeed: 'The Sound of Music',
    sourceReason: 'Original family favourite film (confirmed as urn:entity:movie)',
    status: 'worked',
    confidence: 'High',
    confidenceReason: 'Baseline family favourite',
    provenance: 'qloo_saved',
    qlooEntityType: 'urn:entity:movie',
    mediaLink: {
      platform: 'youtube',
      url: 'https://www.youtube.com/results?search_query=edelweiss+sound+of+music',
      label: 'Watch on YouTube'
    }
  },
  {
    id: 'brenda_lee',
    name: 'Brenda Lee — "I\'m Sorry"',
    domain: 'music',
    year: 1960,
    sourceSeed: 'Patsy Cline',
    sourceReason: 'People with affinity for Patsy Cline often connect with Brenda Lee (Owen Bradley Nashville Sound cluster)',
    status: 'untested',
    confidence: 'Medium',
    confidenceReason: 'Close Qloo affinity match',
    provenance: 'qloo_saved',
    qlooEntityType: 'urn:entity:artist',
    mediaLink: {
      platform: 'spotify',
      url: 'https://open.spotify.com/search/brenda%20lee%20im%20sorry',
      label: 'Play on Spotify'
    }
  },
  {
    id: 'lake_erie_breeze',
    name: 'Lake Erie Shoreline Memory & Cinnamon Aroma',
    domain: 'food',
    year: 1958,
    sourceSeed: 'Lake Erie',
    sourceReason: 'Associated with Lake Erie leisure memories',
    status: 'untested',
    confidence: 'Low',
    confidenceReason: 'Hypothesis experiment',
    provenance: 'placeholder',
    mediaLink: {
      platform: 'youtube',
      url: 'https://www.youtube.com/results?search_query=lake+erie+1950s+vintage+footage',
      label: 'View Vintage Lake Erie Clip on YouTube'
    }
  }
];

export const SAMPLE_DOROTHY_PROFILE: CaregiverProfile = {
  id: 'profile-dorothy',
  lovedOneName: 'Dorothy',
  birthYear: 1946,
  homeRegion: 'Ohio, USA',
  eraStart: 1955,
  eraEnd: 1975,
  hobbies: 'Baking apple pies, church choir, gardening, walks by Lake Erie',
  seeds: {
    music: 'Patsy Cline',
    film: 'The Sound of Music',
    food: 'Apple Pie',
    place: 'Lake Erie'
  },
  confirmedEntities: {
    'Patsy Cline': {
      id: 'patsy-art-01',
      name: 'Patsy Cline',
      type: 'urn:entity:artist',
      description: 'American country music singer'
    },
    'The Sound of Music': {
      id: 'som-mov-01',
      name: 'The Sound of Music',
      type: 'urn:entity:movie',
      description: '1965 musical drama film directed by Robert Wise'
    }
  },
  avoidList: ['Modern country pop after 1980', 'Fast television clips'],
  currentKit: {
    id: 'kit-dorothy-v1',
    visitNumber: 1,
    generatedAt: 'Generated on demand',
    whyThisKit: [
      'Anchors on Patsy Cline and The Sound of Music as proven safe ground.',
      'Suggests Brenda Lee through 1958–1965 country/pop vocal affinity.',
      'Hypothesis tests whether a tactile apple cinnamon aroma prompts spontaneous storytelling.'
    ],
    provenFavourites: [
      {
        ...DOROTHY_NODES[0],
        slotType: 'proven'
      },
      {
        ...DOROTHY_NODES[1],
        slotType: 'proven'
      }
    ],
    qlooDiscoveries: [
      {
        ...DOROTHY_NODES[2],
        slotType: 'discovery'
      }
    ],
    hypothesis: {
      ...DOROTHY_NODES[3],
      slotType: 'hypothesis',
      hypothesisLabel: 'Testing: does sensory smell (cinnamon & baked apple) prompt childhood memories?'
    },
    sharedMoment: {
      title: 'Humming "Edelweiss" and Cinnamon Scent',
      description: 'Bring a warm cinnamon stick or small slice of spiced apple pie. Play "Edelweiss" softly.',
      actionPrompt: 'Ask her: "Mom, do you remember the big summer picnics we took by the lake?"'
    },
    conversationOpeners: [
      '"Mom, doesn\'t that Patsy Cline song bring you right back to Saturday evenings?"',
      '"I brought a hint of cinnamon today—remember baking every October weekend?"',
      '"The water looked just like Lake Erie on the drive over here today."'
    ],
    stopCues: [
      'If she closes her eyes or pulls her hand back, stop asking questions and hum softly alongside the melody.',
      'If ambient noise creates irritation, focus solely on the scent and gentle touch.'
    ]
  },
  tasteMapNodes: DOROTHY_NODES,
  domainStats: {
    musicLitUpCount: 2,
    filmLitUpCount: 1,
    foodLitUpCount: 1,
    placeLitUpCount: 0
  },
  visitHistory: []
};
