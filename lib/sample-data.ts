/**
 * Sample profiles for judges.
 *
 * What's in here is only what a family would type in: favourites, an avoid list, and
 * (for Nomvula) three clearly labelled sample visits. There are NO Qloo discoveries in
 * this file. Every discovery shown in the app comes from a Qloo response at run time
 * (live, or captured earlier into data/qloo-fixtures/).
 */
import { CaregiverProfile, TasteEntity } from './types';
import { mediaLinkFor } from './care-logic';

function seed(
  id: string,
  name: string,
  domain: TasteEntity['domain'],
  opts: Partial<TasteEntity> & { query?: { query: string; type: string } } = {}
): TasteEntity {
  const { query, ...rest } = opts;
  return {
    id,
    name,
    domain,
    sourceSeed: name,
    sourceReason: query ? 'Family memory. Gentle visit will look it up in Qloo.' : 'Family memory.',
    status: 'worked',
    confidence: 'High',
    confidenceReason: 'Family favourite',
    provenance: 'family',
    qlooQuery: query,
    mediaLink: mediaLinkFor(name, domain),
    ...rest
  };
}

// ---------------------------------------------------------------------------
// Nomvula, born 1948, Soweto. Three sample visits already logged.
// ---------------------------------------------------------------------------
export const SAMPLE_NOMVULA_PROFILE: CaregiverProfile = {
  id: 'profile-nomvula',
  isSample: true,
  lovedOneName: 'Nomvula',
  birthYear: 1948,
  homeRegion: 'Soweto, Johannesburg, South Africa',
  eraStart: 1960,
  eraEnd: 1978,
  hobbies: 'Church choir, tea on the stoep, vegetable gardening',
  seeds: {
    music: 'Miriam Makeba',
    film: 'Come Back, Africa',
    food: 'Umngqusho',
    place: 'Sophiatown'
  },
  avoidList: ['Police raid scenes', 'Loud sirens'],
  tasteMapNodes: [
    seed('seed-makeba', 'Miriam Makeba', 'music', {
      query: { query: 'Miriam Makeba', type: 'urn:entity:artist' },
      confidenceReason: 'Lit up in sample visits 1 and 3',
      lastLitUpVisit: 3,
      lastTriedVisit: 3
    }),
    seed('seed-sophiatown', 'Sophiatown', 'place', {
      query: { query: 'Sophiatown', type: '' },
      confidenceReason: 'Lit up in sample visits 2 and 3',
      lastLitUpVisit: 3,
      lastTriedVisit: 3
    }),
    seed('seed-umngqusho', 'Umngqusho', 'food', {
      sourceReason: 'Family memory. Qloo has no entries for home dishes, so this stays a family memory.',
      confidenceReason: 'Lit up in sample visit 1',
      lastLitUpVisit: 1,
      lastTriedVisit: 1
    }),
    seed('seed-come-back-africa', 'Come Back, Africa (1959 film)', 'film', {
      query: { query: 'Come Back, Africa', type: 'urn:entity:movie' },
      year: 1959,
      status: 'avoid',
      confidenceReason: 'Upset her in sample visit 2 (a police raid scene); never suggested again'
    })
  ],
  domainStats: {
    music: { tried: 2, litUp: 2, upset: 0 },
    place: { tried: 2, litUp: 2, upset: 0 },
    food: { tried: 1, litUp: 1, upset: 0 },
    film: { tried: 1, litUp: 0, upset: 1 }
  },
  visitHistory: [
    {
      id: 'sample-log-3',
      visitNumber: 3,
      date: 'Sample history',
      isSample: true,
      reactions: { 'seed-makeba': 'lit_up', 'seed-sophiatown': 'lit_up' },
      reactedItems: {
        'seed-makeba': { name: 'Miriam Makeba', domain: 'music' },
        'seed-sophiatown': { name: 'Sophiatown', domain: 'place' }
      },
      agentReflections: {
        itemLevel: ['This worked: Miriam Makeba.', 'This worked: Sophiatown.'],
        patternLevel: 'Pattern so far: music reached Nomvula in 2 of 2 tries; places reached Nomvula in 2 of 2 tries.',
        nextVisitLine: 'Next visit: start with Miriam Makeba and Sophiatown, and try one new Qloo discovery.'
      }
    },
    {
      id: 'sample-log-2',
      visitNumber: 2,
      date: 'Sample history',
      isSample: true,
      reactions: { 'seed-come-back-africa': 'upset', 'seed-sophiatown': 'lit_up' },
      reactedItems: {
        'seed-come-back-africa': { name: 'Come Back, Africa (1959 film)', domain: 'film' },
        'seed-sophiatown': { name: 'Sophiatown', domain: 'place' }
      },
      agentReflections: {
        itemLevel: ['Added to the avoid list: Come Back, Africa (1959 film).', 'This worked: Sophiatown.'],
        nextVisitLine: 'Next visit: start with Miriam Makeba and Sophiatown, and leave out Come Back, Africa.'
      }
    },
    {
      id: 'sample-log-1',
      visitNumber: 1,
      date: 'Sample history',
      isSample: true,
      reactions: { 'seed-makeba': 'lit_up', 'seed-umngqusho': 'lit_up' },
      reactedItems: {
        'seed-makeba': { name: 'Miriam Makeba', domain: 'music' },
        'seed-umngqusho': { name: 'Umngqusho', domain: 'food' }
      },
      agentReflections: {
        itemLevel: ['This worked: Miriam Makeba.', 'This worked: Umngqusho.'],
        nextVisitLine: 'Next visit: start with Miriam Makeba and Umngqusho.'
      }
    }
  ]
};

// ---------------------------------------------------------------------------
// Dorothy, born 1946, Ohio. No visits yet: shows a first kit.
// ---------------------------------------------------------------------------
export const SAMPLE_DOROTHY_PROFILE: CaregiverProfile = {
  id: 'profile-dorothy',
  isSample: true,
  lovedOneName: 'Dorothy',
  birthYear: 1946,
  homeRegion: 'Ohio, USA',
  eraStart: 1958,
  eraEnd: 1976,
  hobbies: 'Baking, church choir, gardening, walks by Lake Erie',
  seeds: {
    music: 'Patsy Cline',
    film: 'The Sound of Music',
    food: 'Apple pie',
    place: 'Lake Erie'
  },
  avoidList: ['Fast-cut television clips'],
  tasteMapNodes: [
    seed('seed-patsy-cline', 'Patsy Cline', 'music', {
      query: { query: 'Patsy Cline', type: 'urn:entity:artist' },
      confidenceReason: 'Family favourite (no visits logged yet)'
    }),
    seed('seed-sound-of-music', 'The Sound of Music', 'film', {
      query: { query: 'The Sound of Music', type: 'urn:entity:movie' },
      year: 1965,
      confidenceReason: 'Family favourite (no visits logged yet)'
    }),
    seed('seed-apple-pie', 'Apple pie', 'food', {
      sourceReason: 'Family memory. Qloo has no entries for home dishes, so this stays a family memory.',
      confidenceReason: 'Family favourite (no visits logged yet)'
    }),
    seed('seed-lake-erie', 'Lake Erie', 'place', {
      confidenceReason: 'Family favourite (no visits logged yet)'
    })
  ],
  domainStats: {},
  visitHistory: []
};

export const SAMPLE_PROFILES = [SAMPLE_NOMVULA_PROFILE, SAMPLE_DOROTHY_PROFILE];
