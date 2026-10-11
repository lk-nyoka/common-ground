import { CaregiverProfile, TasteEntity, VisitKit } from './types';

// ============================================================================
// PROFILE 1: Margaret, born 1946, England (Lead Showcase)
// Seeds: Dolly Parton, The Sound of Music, Apple Pie, The Lake District
// Era: 1958 - 1978 (Ages 12 - 32)
// ============================================================================

export const MARGARET_NODES: TasteEntity[] = [
  // 1. Proven Safe Ground (Green)
  {
    id: 'dolly_parton',
    name: 'Dolly Parton — "Coat of Many Colors" & "Jolene"',
    domain: 'music',
    year: 1971,
    sourceSeed: 'Dolly Parton',
    sourceReason: 'Original family memory (sang in kitchen)',
    status: 'worked',
    confidence: 'High',
    confidenceReason: 'Lit up in Visits 1 & 3; tapped feet and smiled',
    mediaLink: {
      platform: 'spotify',
      url: 'https://open.spotify.com/search/dolly%20parton%20coat%20of%20many%20colors',
      label: 'Play on Spotify'
    }
  },
  {
    id: 'apple_pie',
    name: 'Warm Apple Pie Aroma with Cinnamon Stick',
    domain: 'food',
    year: 1962,
    sourceSeed: 'Apple Pie',
    sourceReason: 'Original family memory (baked every Sunday)',
    status: 'worked',
    confidence: 'High',
    confidenceReason: 'Smelled warm cinnamon in Visit 3; recalled mother baking',
    mediaLink: {
      platform: 'recipe',
      url: 'https://en.wikipedia.org/wiki/Apple_pie',
      label: 'Comfort Food Memory'
    }
  },
  {
    id: 'lake_district_photos',
    name: 'Lake District & Windermere Archival Postcards (1960s)',
    domain: 'place',
    year: 1964,
    sourceSeed: 'The Lake District',
    sourceReason: 'Original family memory (annual family holiday walks)',
    status: 'worked',
    confidence: 'High',
    confidenceReason: 'Looked at photos for 15 minutes in Visit 2; pointed to rowboats',
    mediaLink: {
      platform: 'photo',
      url: 'https://en.wikipedia.org/wiki/Lake_District',
      label: 'View Archival Photos'
    }
  },

  // 2. Qloo Discoveries (Amber - Untested)
  {
    id: 'emmylou_harris',
    name: 'Emmylou Harris & Linda Ronstadt (Trio Harmony)',
    domain: 'music',
    year: 1975,
    sourceSeed: 'Dolly Parton',
    sourceReason: 'Discovered by Qloo from Dolly Parton (acoustic vocal harmony cluster)',
    status: 'untested',
    confidence: 'Medium',
    confidenceReason: 'Close Qloo cultural neighbour to Dolly Parton',
    mediaLink: {
      platform: 'spotify',
      url: 'https://open.spotify.com/search/emmylou%20harris%20boulder%20to%20birmingham',
      label: 'Play on Spotify'
    }
  },
  {
    id: 'sound_of_music_edelweiss',
    name: 'Julie Andrews — "Edelweiss" & "My Favorite Things"',
    domain: 'music',
    year: 1965,
    sourceSeed: 'The Sound of Music',
    sourceReason: 'Connected to The Sound of Music (calm acoustic melody)',
    status: 'untested',
    confidence: 'Medium',
    confidenceReason: 'Qloo soundtrack affinity match',
    mediaLink: {
      platform: 'youtube',
      url: 'https://www.youtube.com/results?search_query=edelweiss+sound+of+music+julie+andrews',
      label: 'Watch on YouTube'
    }
  },
  {
    id: 'beatrix_potter_hilltop',
    name: 'Beatrix Potter Hill Top Farm & Cottage Garden (Near Windermere)',
    domain: 'place',
    year: 1966,
    sourceSeed: 'The Lake District',
    sourceReason: 'Associated with the Lake District via Qloo cultural geography',
    status: 'untested',
    confidence: 'Low',
    confidenceReason: 'This visit’s hypothesis experiment',
    mediaLink: {
      platform: 'photo',
      url: 'https://en.wikipedia.org/wiki/Hill_Top,_Cumbria',
      label: 'Explore Cottage Garden'
    }
  },

  // 3. Avoid List (Red - Distress Filter)
  {
    id: 'battle_film_siren',
    name: 'Loud Air Raid Siren Scene from 1960s War Drama Film',
    domain: 'film',
    year: 1968,
    sourceSeed: 'The Sound of Music',
    sourceReason: 'Original test clip in Visit 2',
    status: 'avoid',
    confidence: 'High',
    confidenceReason: 'Marked UPSET in Visit 2 — loud siren noise caused agitation',
  }
];

export const MARGARET_KIT: VisitKit = {
  id: 'kit-margaret-v4',
  visitNumber: 4,
  generatedAt: 'Today, 20 minutes before visit',
  whyThisKit: [
    'Builds on the two songs and bakery aromas that lit Margaret up in previous visits.',
    'Leaves out all film clips with sudden sirens or loud brass after she showed distress in Visit 2.',
    'Tests one gentle hypothesis: whether Beatrix Potter cottage garden photos from near Windermere prompt peaceful conversation.'
  ],
  provenFavourites: [
    {
      ...MARGARET_NODES[0], // Dolly Parton
      slotType: 'proven'
    },
    {
      ...MARGARET_NODES[1], // Apple Pie
      slotType: 'proven'
    }
  ],
  qlooDiscoveries: [
    {
      ...MARGARET_NODES[3], // Emmylou Harris
      slotType: 'discovery'
    }
  ],
  hypothesis: {
    ...MARGARET_NODES[5], // Beatrix Potter Hill Top
    slotType: 'hypothesis',
    hypothesisLabel: 'Testing: does she respond to place-based memories of cottage gardens near Lake Windermere?'
  },
  sharedMoment: {
    title: 'The Sunday Afternoon Apple Pie & Harmony Moment',
    description: 'Bring a warm cinnamon stick or small slice of spiced apple pie. Play Dolly Parton’s "Coat of Many Colors" softly in the background.',
    actionPrompt: 'Ask her: "Mum, do you remember who used to sneak the first slice of warm pie on Sunday afternoons?"'
  },
  conversationOpeners: [
    '"Mum, I heard Dolly Parton singing this morning and it reminded me of our kitchen baking days."',
    '"Look at this old postcard of the rowboats on Lake Windermere—do you remember the cool lake breeze?"',
    '"I brought a hint of cinnamon today—remember how the whole house used to smell like autumn?"'
  ],
  stopCues: [
    'If her eyes wander, fingers tense, or she grows silent for over two minutes, pause the audio gently without drawing attention.',
    'If breathing quickens or agitation appears, switch from asking questions to quiet presence: hold her hand and mention a peaceful familiar memory.'
  ]
};

export const SAMPLE_MARGARET_PROFILE: CaregiverProfile = {
  id: 'profile-margaret',
  lovedOneName: 'Margaret',
  birthYear: 1946,
  homeRegion: 'Cumbria & Yorkshire, England',
  eraStart: 1958,
  eraEnd: 1978,
  hobbies: 'Cottage gardening, baking apple pies, Sunday church choir, walks in the countryside',
  seeds: {
    music: 'Dolly Parton',
    film: 'The Sound of Music',
    food: 'Apple Pie',
    place: 'The Lake District'
  },
  avoidList: ['Air raid sirens and war movie scenes', 'Loud brass fanfares', 'Sudden electronic sounds'],
  currentKit: MARGARET_KIT,
  tasteMapNodes: MARGARET_NODES,
  domainStats: {
    musicLitUpCount: 3,
    filmLitUpCount: 0,
    foodLitUpCount: 2,
    placeLitUpCount: 2
  },
  visitHistory: [
    {
      id: 'log-1',
      visitNumber: 1,
      date: '3 weeks ago',
      reactions: {
        dolly_parton: 'lit_up',
        apple_pie: 'lit_up'
      },
      agentReflections: {
        itemLevel: ['This worked: Dolly Parton (tapped her fingers and smiled immediately).', 'This worked: Apple pie memory (smiled warmly).'],
        nextVisitLine: 'Next visit: Keep acoustic vocal music front and center, introduce Lake District scenery.'
      }
    },
    {
      id: 'log-2',
      visitNumber: 2,
      date: '2 weeks ago',
      reactions: {
        battle_film_siren: 'upset',
        lake_district_photos: 'lit_up'
      },
      agentReflections: {
        itemLevel: [
          'This worked: Lake District archival postcards (looked at rowboats for 15 minutes).',
          'Avoid list added: Loud air raid scene in film clip triggered agitation and fear.'
        ],
        patternLevel: 'Pattern emerging: Screen-based video scenes cause agitation; still photographs and acoustic vocals create grounded calm.',
        nextVisitLine: 'Next visit: Permanently drop video clips; expand acoustic harmony neighbours and place-based tactile memories.'
      }
    },
    {
      id: 'log-3',
      visitNumber: 3,
      date: '5 days ago',
      reactions: {
        dolly_parton: 'lit_up',
        apple_pie: 'lit_up'
      },
      agentReflections: {
        itemLevel: ['This worked: Dolly Parton and warm apple pie aroma once again reached her.'],
        patternLevel: 'I noticed something: She responds most deeply to vocal harmonies and familiar baking aromas, while video clips lose her after a few minutes.',
        nextVisitLine: 'Next visit: Start with Dolly Parton and apple pie, test Emmylou Harris harmony and Beatrix Potter cottage garden photos.'
      }
    }
  ]
};

// ============================================================================
// PROFILE 2: Rosa, born 1950, Italy
// Seeds: Elvis Presley, Casablanca, Spaghetti Bolognese, Rome
// Era: 1962 - 1982
// ============================================================================

export const SAMPLE_ROSA_PROFILE: CaregiverProfile = {
  id: 'profile-rosa',
  lovedOneName: 'Rosa',
  birthYear: 1950,
  homeRegion: 'Rome, Italy',
  eraStart: 1962,
  eraEnd: 1982,
  hobbies: 'Opera, making fresh pasta, walks by the Colosseum, espresso mornings',
  seeds: {
    music: 'Elvis Presley',
    film: 'Casablanca',
    food: 'Spaghetti Bolognese',
    place: 'Rome'
  },
  avoidList: ['Modern techno music', 'Dark detective movies'],
  currentKit: {
    id: 'kit-rosa-v1',
    visitNumber: 1,
    generatedAt: 'Generated on demand',
    whyThisKit: [
      'Starts on safe ground with Elvis Presley ballads ("Can’t Help Falling in Love") and Italian comfort cooking.',
      'Discovered Dean Martin and Mina through Qloo’s 1960s Rome/vocal pop affinity graph.',
      'Hypothesis tests whether fresh basil aroma and Roman piazza photos spark spontaneous storytelling.'
    ],
    provenFavourites: [
      {
        id: 'elvis_ballad',
        name: 'Elvis Presley — "Can\'t Help Falling in Love"',
        domain: 'music',
        year: 1961,
        sourceSeed: 'Elvis Presley',
        sourceReason: 'Original family favourite',
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Baseline family memory',
        slotType: 'proven',
        mediaLink: {
          platform: 'spotify',
          url: 'https://open.spotify.com/search/elvis%20cant%20help%20falling%20in%20love',
          label: 'Play on Spotify'
        }
      },
      {
        id: 'casablanca_theme',
        name: '"As Time Goes By" (Casablanca Piano Theme)',
        domain: 'film',
        year: 1942,
        sourceSeed: 'Casablanca',
        sourceReason: 'Original family favourite film',
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Baseline family memory',
        slotType: 'proven',
        mediaLink: {
          platform: 'youtube',
          url: 'https://www.youtube.com/results?search_query=as+time+goes+by+casablanca',
          label: 'Watch on YouTube'
        }
      }
    ],
    qlooDiscoveries: [
      {
        id: 'dean_martin_rome',
        name: 'Dean Martin — "On an Evening in Roma"',
        domain: 'music',
        year: 1959,
        sourceSeed: 'Elvis Presley',
        sourceReason: 'Discovered by Qloo from Elvis Presley & Rome crossover cluster',
        status: 'untested',
        confidence: 'Medium',
        confidenceReason: 'Close Qloo cultural neighbor',
        slotType: 'discovery',
        mediaLink: {
          platform: 'spotify',
          url: 'https://open.spotify.com/search/dean%20martin%20on%20an%20evening%20in%20roma',
          label: 'Play on Spotify'
        }
      }
    ],
    hypothesis: {
      id: 'fresh_basil_piazza',
      name: 'Fresh Sweet Basil Aroma & Piazza Navona Postcard',
      domain: 'food',
      year: 1965,
      sourceSeed: 'Spaghetti Bolognese',
      sourceReason: 'Discovered by Qloo from Roman culinary heritage',
      status: 'untested',
      confidence: 'Low',
      confidenceReason: 'Hypothesis experiment',
      slotType: 'hypothesis',
      hypothesisLabel: 'Testing: does the scent of fresh bruised basil trigger vivid kitchen memories?'
    },
    sharedMoment: {
      title: 'A Roman Evening Melody & Sweet Basil Scent',
      description: 'Gently crush a sprig of fresh basil between your fingers so the fragrance fills the space. Play "On an Evening in Roma" softly.',
      actionPrompt: 'Ask her: "Mamma, do you remember who used to pick the basil for Sunday lunch?"'
    },
    conversationOpeners: [
      '"Mamma, I heard this Elvis song this morning and remembered you singing by the window."',
      '"Look at this photo of Piazza Navona on a sunny Sunday afternoon—remember the fountain walks?"',
      '"Smell this fresh basil—doesn’t it smell just like your kitchen on Sundays?"'
    ],
    stopCues: [
      'If she turns away or closes her eyes firmly, stop asking questions and hum softly with the melody.',
      'If hospital or nursing home ambient noises cause confusion, hold her hands gently and speak in quiet Italian phrases.'
    ]
  },
  tasteMapNodes: [
    {
      id: 'elvis_ballad',
      name: 'Elvis Presley',
      domain: 'music',
      year: 1961,
      sourceSeed: 'Elvis Presley',
      sourceReason: 'Family seed',
      status: 'worked',
      confidence: 'High',
      confidenceReason: 'Family favourite'
    },
    {
      id: 'casablanca_theme',
      name: 'Casablanca',
      domain: 'film',
      year: 1942,
      sourceSeed: 'Casablanca',
      sourceReason: 'Family seed',
      status: 'worked',
      confidence: 'High',
      confidenceReason: 'Family favourite'
    },
    {
      id: 'dean_martin_rome',
      name: 'Dean Martin',
      domain: 'music',
      year: 1959,
      sourceSeed: 'Elvis Presley',
      sourceReason: 'Discovered by Qloo from Elvis Presley',
      status: 'untested',
      confidence: 'Medium',
      confidenceReason: 'Qloo neighbour'
    },
    {
      id: 'mina_mazzini',
      name: 'Mina — "Il cielo in una stanza"',
      domain: 'music',
      year: 1960,
      sourceSeed: 'Rome',
      sourceReason: 'Discovered by Qloo from 1960s Roman vocal music',
      status: 'untested',
      confidence: 'Medium',
      confidenceReason: 'Qloo neighbour'
    }
  ],
  domainStats: {
    musicLitUpCount: 2,
    filmLitUpCount: 1,
    foodLitUpCount: 1,
    placeLitUpCount: 1
  },
  visitHistory: []
};

// ============================================================================
// PROFILE 3: Susan, born 1952, United States
// Seeds: The Beatles, Mary Poppins, Fish and Chips, Blackpool
// Era: 1964 - 1984
// ============================================================================

export const SAMPLE_SUSAN_PROFILE: CaregiverProfile = {
  id: 'profile-susan',
  lovedOneName: 'Susan',
  birthYear: 1952,
  homeRegion: 'Lancashire & Boston',
  eraStart: 1964,
  eraEnd: 1984,
  hobbies: 'Sing-alongs, beach picnics, community choir, watching musical films',
  seeds: {
    music: 'The Beatles',
    film: 'Mary Poppins',
    food: 'Fish and Chips',
    place: 'Blackpool'
  },
  avoidList: ['Modern heavy metal', 'Loud action car chases'],
  currentKit: {
    id: 'kit-susan-v1',
    visitNumber: 1,
    generatedAt: 'Generated on demand',
    whyThisKit: [
      'Anchors on The Beatles acoustic melodies and Mary Poppins sing-alongs.',
      'Discovered Gerry and the Pacemakers through Qloo’s Merseybeat cultural graph.',
      'Hypothesis tests whether salt-and-vinegar scent and Blackpool pier photos stimulate spontaneous memories.'
    ],
    provenFavourites: [
      {
        id: 'beatles_here_comes_the_sun',
        name: 'The Beatles — "Here Comes the Sun" & "Penny Lane"',
        domain: 'music',
        year: 1969,
        sourceSeed: 'The Beatles',
        sourceReason: 'Original family favourite',
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Baseline family favourite',
        slotType: 'proven',
        mediaLink: {
          platform: 'spotify',
          url: 'https://open.spotify.com/search/the%20beatles%20here%20comes%20the%20sun',
          label: 'Play on Spotify'
        }
      },
      {
        id: 'mary_poppins_kite',
        name: '"Let\'s Go Fly a Kite" from Mary Poppins',
        domain: 'film',
        year: 1964,
        sourceSeed: 'Mary Poppins',
        sourceReason: 'Original family favourite film',
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Baseline family favourite',
        slotType: 'proven',
        mediaLink: {
          platform: 'youtube',
          url: 'https://www.youtube.com/results?search_query=lets+go+fly+a+kite+mary+poppins',
          label: 'Watch on YouTube'
        }
      }
    ],
    qlooDiscoveries: [
      {
        id: 'gerry_pacemakers',
        name: 'Gerry and the Pacemakers — "Ferry Cross the Mersey"',
        domain: 'music',
        year: 1964,
        sourceSeed: 'The Beatles',
        sourceReason: 'Discovered by Qloo from The Beatles (1964 Merseybeat sound)',
        status: 'untested',
        confidence: 'Medium',
        confidenceReason: 'Close Qloo affinity match',
        slotType: 'discovery',
        mediaLink: {
          platform: 'spotify',
          url: 'https://open.spotify.com/search/gerry%20and%20the%20pacemakers%20ferry%20cross%20the%20mersey',
          label: 'Play on Spotify'
        }
      }
    ],
    hypothesis: {
      id: 'blackpool_illuminations',
      name: 'Blackpool Promenade Tram & Seaside Illuminations Postcard',
      domain: 'place',
      year: 1968,
      sourceSeed: 'Blackpool',
      sourceReason: 'Discovered by Qloo from Blackpool coastal leisure memories',
      status: 'untested',
      confidence: 'Low',
      confidenceReason: 'Hypothesis experiment',
      slotType: 'hypothesis',
      hypothesisLabel: 'Testing: does a vintage photo of Blackpool illuminations spark seaside holiday memories?'
    },
    sharedMoment: {
      title: 'Singing "Penny Lane" and Looking at Blackpool Pier',
      description: 'Play "Penny Lane" softly while looking together at a colourful postcard of the Blackpool promenade.',
      actionPrompt: 'Ask her: "Mom, do you remember walking along the pier eating hot chips wrapped in paper?"'
    },
    conversationOpeners: [
      '"Mom, doesn’t this Beatles song bring back such happy sunny memories?"',
      '"Look at this old tram riding along the seaside promenade—remember the sea breeze?"',
      '"Do you remember who used to sing the chorus loudest on car rides?"'
    ],
    stopCues: [
      'If her breathing quickens or her brow furrows, turn down the music and gently rub her shoulder.',
      'If she repeats a question several times, do not correct her—reassure her with a warm smile.'
    ]
  },
  tasteMapNodes: [
    {
      id: 'beatles_here_comes_the_sun',
      name: 'The Beatles',
      domain: 'music',
      year: 1969,
      sourceSeed: 'The Beatles',
      sourceReason: 'Family seed',
      status: 'worked',
      confidence: 'High',
      confidenceReason: 'Family favourite'
    },
    {
      id: 'mary_poppins_kite',
      name: 'Mary Poppins',
      domain: 'film',
      year: 1964,
      sourceSeed: 'Mary Poppins',
      sourceReason: 'Family seed',
      status: 'worked',
      confidence: 'High',
      confidenceReason: 'Family favourite'
    },
    {
      id: 'gerry_pacemakers',
      name: 'Gerry and the Pacemakers',
      domain: 'music',
      year: 1964,
      sourceSeed: 'The Beatles',
      sourceReason: 'Discovered by Qloo from The Beatles',
      status: 'untested',
      confidence: 'Medium',
      confidenceReason: 'Qloo neighbour'
    }
  ],
  domainStats: {
    musicLitUpCount: 2,
    filmLitUpCount: 1,
    foodLitUpCount: 0,
    placeLitUpCount: 1
  },
  visitHistory: []
};

// ============================================================================
// PROFILE 4: Anna, born 1955, Sweden
// Seeds: ABBA, Grease, Meatballs with lingonberry, Stockholm
// Era: 1967 - 1987
// ============================================================================

export const SAMPLE_ANNA_PROFILE: CaregiverProfile = {
  id: 'profile-anna',
  lovedOneName: 'Anna',
  birthYear: 1955,
  homeRegion: 'Stockholm, Sweden',
  eraStart: 1967,
  eraEnd: 1987,
  hobbies: 'Singing in choirs, folk dancing, summer boating on the archipelago, berry picking',
  seeds: {
    music: 'ABBA',
    film: 'Grease',
    food: 'Meatballs with Lingonberry',
    place: 'Stockholm'
  },
  avoidList: ['Violent television thrillers', 'Sudden loud alarms'],
  currentKit: {
    id: 'kit-anna-v1',
    visitNumber: 1,
    generatedAt: 'Generated on demand',
    whyThisKit: [
      'Starts on safe ground with ABBA vocal harmonies ("Dancing Queen", "Mamma Mia") and Swedish archipelago memories.',
      'Discovered Olivia Newton-John and Ted Gärdestad through Qloo’s 1970s Nordic/pop cultural graph.',
      'Hypothesis tests whether sweet lingonberry jam aroma prompts unprompted childhood memories.'
    ],
    provenFavourites: [
      {
        id: 'abba_dancing_queen',
        name: 'ABBA — "Dancing Queen" & "Fernando"',
        domain: 'music',
        year: 1976,
        sourceSeed: 'ABBA',
        sourceReason: 'Original family favourite',
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Baseline family favourite',
        slotType: 'proven',
        mediaLink: {
          platform: 'spotify',
          url: 'https://open.spotify.com/search/abba%20dancing%20queen',
          label: 'Play on Spotify'
        }
      },
      {
        id: 'grease_summer_nights',
        name: '"Summer Nights" from Grease',
        domain: 'film',
        year: 1978,
        sourceSeed: 'Grease',
        sourceReason: 'Original family favourite film',
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Baseline family favourite',
        slotType: 'proven',
        mediaLink: {
          platform: 'youtube',
          url: 'https://www.youtube.com/results?search_query=summer+nights+grease',
          label: 'Watch on YouTube'
        }
      }
    ],
    qlooDiscoveries: [
      {
        id: 'ted_gardestad',
        name: 'Ted Gärdestad — "Jag ska fånga en ängel"',
        domain: 'music',
        year: 1972,
        sourceSeed: 'ABBA',
        sourceReason: 'Discovered by Qloo from ABBA (Björn & Benny produced Gärdestad)',
        status: 'untested',
        confidence: 'Medium',
        confidenceReason: 'Close Qloo affinity match',
        slotType: 'discovery',
        mediaLink: {
          platform: 'spotify',
          url: 'https://open.spotify.com/search/ted%20gardestad%20jag%20ska%20fanga%20en%20angel',
          label: 'Play on Spotify'
        }
      }
    ],
    hypothesis: {
      id: 'stockholm_archipelago_summer',
      name: 'Stockholm Archipelago Red Cottage & Lingonberry Aroma',
      domain: 'place',
      year: 1974,
      sourceSeed: 'Stockholm',
      sourceReason: 'Discovered by Qloo from Stockholm summer memories',
      status: 'untested',
      confidence: 'Low',
      confidenceReason: 'Hypothesis experiment',
      slotType: 'hypothesis',
      hypothesisLabel: 'Testing: does sensory smell of lingonberry and archipelago photos prompt childhood summer memories?'
    },
    sharedMoment: {
      title: 'Tapping to ABBA and Looking at Summer Island Photos',
      description: 'Play "Fernando" softly while holding a postcard of wooden summer houses in the Stockholm archipelago.',
      actionPrompt: 'Ask her: "Mamma, do you remember who could row the boat all the way across the island bay?"'
    },
    conversationOpeners: [
      '"Mamma, I heard this ABBA song this morning and remembered you singing in the car."',
      '"Look at this photo of the summer boats on the water—remember midsummer afternoons?"',
      '"Do you remember who used to pick the biggest bowl of wild berries?"'
    ],
    stopCues: [
      'If her hands tense or she looks distressed, pause the music and hum softly.',
      'If she seems tired, simply sit quietly and let her hold your hand in peaceful company.'
    ]
  },
  tasteMapNodes: [
    {
      id: 'abba_dancing_queen',
      name: 'ABBA',
      domain: 'music',
      year: 1976,
      sourceSeed: 'ABBA',
      sourceReason: 'Family seed',
      status: 'worked',
      confidence: 'High',
      confidenceReason: 'Family favourite'
    },
    {
      id: 'grease_summer_nights',
      name: 'Grease',
      domain: 'film',
      year: 1978,
      sourceSeed: 'Grease',
      sourceReason: 'Family seed',
      status: 'worked',
      confidence: 'High',
      confidenceReason: 'Family favourite'
    },
    {
      id: 'ted_gardestad',
      name: 'Ted Gärdestad',
      domain: 'music',
      year: 1972,
      sourceSeed: 'ABBA',
      sourceReason: 'Discovered by Qloo from ABBA',
      status: 'untested',
      confidence: 'Medium',
      confidenceReason: 'Qloo neighbour'
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

// ============================================================================
// PROFILE 5: Nomvula, born 1948, Soweto (South Africa Showcase)
// ============================================================================

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
  currentKit: {
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
        id: 'makeba',
        name: 'Miriam Makeba — "Pata Pata" & "Lakutshn, Ilanga"',
        domain: 'music',
        year: 1957,
        sourceSeed: 'Miriam Makeba',
        sourceReason: 'Original family seed',
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Lit up twice across previous visits',
        slotType: 'proven',
        mediaLink: {
          platform: 'youtube',
          url: 'https://www.youtube.com/results?search_query=miriam+makeba+lakutshn+ilanga',
          label: 'Listen on YouTube'
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
        slotType: 'proven',
        mediaLink: {
          platform: 'photo',
          url: 'https://en.wikipedia.org/wiki/Sophiatown',
          label: 'Historical Archive'
        }
      }
    ],
    qlooDiscoveries: [
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
        slotType: 'discovery',
        mediaLink: {
          platform: 'spotify',
          url: 'https://open.spotify.com/search/dorothy%20masuka',
          label: 'Listen on Spotify'
        }
      }
    ],
    hypothesis: {
      id: 'spokes_mashiyane',
      name: 'Spokes Mashiyane — Pennywhistle Kwela',
      domain: 'music',
      year: 1958,
      sourceSeed: 'Sophiatown',
      sourceReason: 'Discovered by Qloo from Sophiatown place-sound affinity',
      status: 'untested',
      confidence: 'Low',
      confidenceReason: 'This visit’s hypothesis experiment',
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
  },
  tasteMapNodes: [
    {
      id: 'makeba',
      name: 'Miriam Makeba',
      domain: 'music',
      year: 1957,
      sourceSeed: 'Miriam Makeba',
      sourceReason: 'Original family seed',
      status: 'worked',
      confidence: 'High',
      confidenceReason: 'Lit up twice across previous visits'
    },
    {
      id: 'umngqusho',
      name: 'Umngqusho',
      domain: 'food',
      year: 1955,
      sourceSeed: 'Umngqusho',
      sourceReason: 'Original family seed',
      status: 'worked',
      confidence: 'High',
      confidenceReason: 'Smiled and recalled mother preparing it'
    },
    {
      id: 'sophiatown_photos',
      name: 'Sophiatown Photos',
      domain: 'place',
      year: 1955,
      sourceSeed: 'Sophiatown',
      sourceReason: 'Original family seed',
      status: 'worked',
      confidence: 'High',
      confidenceReason: 'Kept her talking for 15 minutes'
    },
    {
      id: 'dorothy_masuka',
      name: 'Dorothy Masuka',
      domain: 'music',
      year: 1956,
      sourceSeed: 'Miriam Makeba',
      sourceReason: 'Discovered by Qloo from Miriam Makeba',
      status: 'untested',
      confidence: 'Medium',
      confidenceReason: 'Close Qloo neighbour'
    }
  ],
  domainStats: {
    musicLitUpCount: 4,
    filmLitUpCount: 0,
    foodLitUpCount: 2,
    placeLitUpCount: 3
  },
  visitHistory: []
};
