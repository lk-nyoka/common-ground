import { CaregiverProfile, TasteEntity, VisitKit } from './types';

export const NOMVULA_NODES: TasteEntity[] = [
  // Center seeds & Proven (Green)
  {
    id: 'makeba',
    name: 'Miriam Makeba — "Pata Pata" & "Lakutshn, Ilanga"',
    domain: 'music',
    year: 1957,
    sourceSeed: 'Miriam Makeba',
    sourceReason: 'Original family seed',
    status: 'worked',
    confidence: 'High',
    confidenceReason: 'Lit up twice across previous visits',
    mediaLink: {
      platform: 'youtube',
      url: 'https://www.youtube.com/results?search_query=miriam+makeba+lakutshn+ilanga',
      label: 'Listen on YouTube'
    }
  },
  {
    id: 'umngqusho',
    name: 'Umngqusho (Samp & Sugar Beans comfort aroma)',
    domain: 'food',
    year: 1955,
    sourceSeed: 'Umngqusho',
    sourceReason: 'Original family seed',
    status: 'worked',
    confidence: 'High',
    confidenceReason: 'Smiled and recalled mother preparing it',
    mediaLink: {
      platform: 'recipe',
      url: 'https://en.wikipedia.org/wiki/Umngqusho',
      label: 'Traditional Recipe'
    }
  },
  {
    id: 'sophiatown_photos',
    name: 'Sophiatown Street Life & Market Photos',
    domain: 'place',
    year: 1955,
    sourceSeed: 'Sophiatown',
    sourceReason: 'Original family seed',
    status: 'worked',
    confidence: 'High',
    confidenceReason: 'Kept her talking for 15 minutes about Sunday market walks',
    mediaLink: {
      platform: 'photo',
      url: 'https://en.wikipedia.org/wiki/Sophiatown',
      label: 'Historical Archive'
    }
  },
  // Qloo Discoveries (Amber - Untested or testing)
  {
    id: 'dorothy_masuka',
    name: 'Dorothy Masuka — "Hamba Nontsokolo"',
    domain: 'music',
    year: 1956,
    sourceSeed: 'Miriam Makeba',
    sourceReason: 'Discovered by Qloo from Miriam Makeba (contemporary Soweto vocal jazz)',
    status: 'untested',
    confidence: 'Medium',
    confidenceReason: 'Close Qloo neighbour of Miriam Makeba',
    mediaLink: {
      platform: 'spotify',
      url: 'https://open.spotify.com/search/dorothy%20masuka',
      label: 'Listen on Spotify'
    }
  },
  {
    id: 'manhattan_brothers',
    name: 'The Manhattan Brothers — Vocal harmonies',
    domain: 'music',
    year: 1954,
    sourceSeed: 'Miriam Makeba',
    sourceReason: 'Discovered by Qloo from Miriam Makeba (Makeba began singing with them in 1954)',
    status: 'untested',
    confidence: 'Medium',
    confidenceReason: 'Historical vocal affinity cluster',
    mediaLink: {
      platform: 'youtube',
      url: 'https://www.youtube.com/results?search_query=the+manhattan+brothers',
      label: 'Listen on YouTube'
    }
  },
  {
    id: 'spokes_mashiyane',
    name: 'Spokes Mashiyane — Pennywhistle Kwela',
    domain: 'music',
    year: 1958,
    sourceSeed: 'Sophiatown',
    sourceReason: 'Discovered by Qloo from Sophiatown place-sound affinity',
    status: 'untested',
    confidence: 'Low',
    confidenceReason: 'This visit’s hypothesis experiment',
    mediaLink: {
      platform: 'youtube',
      url: 'https://www.youtube.com/results?search_query=spokes+mashiyane+kwela',
      label: 'Listen on YouTube'
    }
  },
  // Avoid item (Red)
  {
    id: 'come_back_africa_film',
    name: 'Film: "Come Back, Africa" (1959 Street Scene Clip)',
    domain: 'film',
    year: 1959,
    sourceSeed: 'Come Back, Africa',
    sourceReason: 'Original family seed',
    status: 'avoid',
    confidence: 'High',
    confidenceReason: 'Marked upset in Visit 2 — police raid scene triggered distress',
  }
];

export const NOMVULA_KIT: VisitKit = {
  id: 'kit-nomvula-v4',
  visitNumber: 4,
  generatedAt: 'Today, 20 minutes before visit',
  whyThisKit: [
    'Builds on the two songs and market memories that lit her up in previous visits.',
    'Excludes historical film clips that previously triggered distress (police sirens/raids).',
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
  avoidList: ['Police raid clips from Come Back, Africa', 'Loud brass sirens', '1970s hard rock'],
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
      date: '2 weeks ago',
      reactions: {
        makeba: 'lit_up',
        umngqusho: 'lit_up'
      },
      agentReflections: {
        itemLevel: ['This worked: Miriam Makeba (hummed along immediately).'],
        nextVisitLine: 'Next visit: Keep vocal music front and center, add place memories from Sophiatown.'
      }
    },
    {
      id: 'log-2',
      visitNumber: 2,
      date: '1 week ago',
      reactions: {
        come_back_africa_film: 'upset',
        sophiatown_photos: 'lit_up'
      },
      agentReflections: {
        itemLevel: [
          'This worked: Sophiatown market photos (talked about Sunday walks).',
          'Avoid list added: "Come Back, Africa" street scene triggered distress.'
        ],
        patternLevel: 'Pattern emerging: Screen-based video causes tension; still photos and music create calm connection.',
        nextVisitLine: 'Next visit: Exclude all film clips; expand vocal music neighbours and place-based tactile memories.'
      }
    },
    {
      id: 'log-3',
      visitNumber: 3,
      date: '3 days ago',
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
  avoidList: ['Modern country pop after 1980', 'Fast television clips'],
  currentKit: {
    id: 'kit-dorothy-v1',
    visitNumber: 1,
    generatedAt: 'Generated on demand',
    whyThisKit: [
      'Anchors on Patsy Cline and The Sound of Music as proven safe ground.',
      'Discovered Brenda Lee and Loretta Lynn through Qloo’s 1958–1965 country/pop graph.',
      'Hypothesis tests whether a tactile apple cinnamon aroma stimulates more conversation than audio alone.'
    ],
    provenFavourites: [
      {
        id: 'patsy_cline',
        name: 'Patsy Cline — "Crazy" & "Walkin\' After Midnight"',
        domain: 'music',
        year: 1961,
        sourceSeed: 'Patsy Cline',
        sourceReason: 'Original family seed',
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Family baseline favourite',
        mediaLink: {
          platform: 'spotify',
          url: 'https://open.spotify.com/search/patsy%20cline%20crazy',
          label: 'Listen on Spotify'
        }
      },
      {
        id: 'sound_of_music',
        name: '"Edelweiss" from The Sound of Music',
        domain: 'music',
        year: 1965,
        sourceSeed: 'The Sound of Music',
        sourceReason: 'Original family seed',
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Family baseline favourite',
        mediaLink: {
          platform: 'youtube',
          url: 'https://www.youtube.com/results?search_query=edelweiss+sound+of+music',
          label: 'Watch on YouTube'
        }
      }
    ],
    qlooDiscoveries: [
      {
        id: 'brenda_lee',
        name: 'Brenda Lee — "I\'m Sorry"',
        domain: 'music',
        year: 1960,
        sourceSeed: 'Patsy Cline',
        sourceReason: 'Discovered by Qloo from Patsy Cline (Owen Bradley Nashville Sound cluster)',
        status: 'untested',
        confidence: 'Medium',
        confidenceReason: 'Close Qloo affinity match'
      }
    ],
    hypothesis: {
      id: 'lake_erie_breeze',
      name: 'Lake Erie Shoreline Memory & Cinnamon Stick Aroma',
      domain: 'food',
      year: 1958,
      sourceSeed: 'Lake Erie',
      sourceReason: 'Discovered by Qloo from Lake Erie leisure memories',
      status: 'untested',
      confidence: 'Low',
      confidenceReason: 'Hypothesis experiment',
      slotType: 'hypothesis',
      hypothesisLabel: 'Testing: does sensory smell (cinnamon & baked apple) prompt unprompted childhood memories?'
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
      'If ambient nursing home noise creates irritation, focus solely on the scent and gentle touch.'
    ]
  },
  tasteMapNodes: [
    {
      id: 'patsy_cline',
      name: 'Patsy Cline',
      domain: 'music',
      year: 1961,
      sourceSeed: 'Patsy Cline',
      sourceReason: 'Family seed',
      status: 'worked',
      confidence: 'High',
      confidenceReason: 'Proven favourite'
    },
    {
      id: 'sound_of_music',
      name: 'The Sound of Music',
      domain: 'film',
      year: 1965,
      sourceSeed: 'The Sound of Music',
      sourceReason: 'Family seed',
      status: 'worked',
      confidence: 'High',
      confidenceReason: 'Proven favourite'
    },
    {
      id: 'brenda_lee',
      name: 'Brenda Lee',
      domain: 'music',
      year: 1960,
      sourceSeed: 'Patsy Cline',
      sourceReason: 'Discovered by Qloo from Patsy Cline',
      status: 'untested',
      confidence: 'Medium',
      confidenceReason: 'Close Qloo neighbour'
    },
    {
      id: 'loretta_lynn',
      name: 'Loretta Lynn',
      domain: 'music',
      year: 1966,
      sourceSeed: 'Patsy Cline',
      sourceReason: 'Discovered by Qloo from Patsy Cline',
      status: 'untested',
      confidence: 'Medium',
      confidenceReason: 'Close Qloo neighbour'
    }
  ],
  domainStats: {
    musicLitUpCount: 2,
    filmLitUpCount: 1,
    foodLitUpCount: 1,
    placeLitUpCount: 0
  },
  visitHistory: []
};
