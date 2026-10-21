/** Sample pairs and empty sessions. Samples are only favourites: every result still comes from Qloo. */
import type { Favourite, FavouriteType, Person, Session } from './types';

let n = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(n++).toString(36)}`;

export function fav(query: string, type: FavouriteType): Favourite {
  return { id: uid('fav'), query, type };
}

export function person(id: 'a' | 'b', name: string, favourites: Favourite[]): Person {
  return { id, name, favourites, liked: [] };
}

export function newSession(
  a: Person,
  b: Person,
  minutes = 120,
  exclusions: string[] = [],
  isSample = false,
  opts: { country?: string; includeLocal?: boolean } = {}
): Session {
  return {
    id: uid('s'),
    isSample,
    people: [a, b],
    minutes,
    exclusions,
    country: opts.country || 'za',
    includeLocal: opts.includeLocal ?? true,
    plans: [],
    feedback: [],
    seen: [],
    rejected: [],
    tally: {}
  };
}

export interface SamplePair {
  label: string;
  hint: string;
  make: () => Session;
}

export const SAMPLE_PAIRS: SamplePair[] = [
  {
    label: 'Gogo and Lwazi',
    hint: 'Miriam Makeba meets Tyla',
    make: () =>
      newSession(
        person('a', 'Gogo', [fav('Miriam Makeba', 'urn:entity:artist')]),
        person('b', 'Lwazi', [fav('Tyla', 'urn:entity:artist'), fav('Black Panther', 'urn:entity:movie')]),
        120,
        ['horror'],
        true
      )
  },
  {
    label: 'Thabo and Naledi',
    hint: 'Metallica meets Taylor Swift',
    make: () =>
      newSession(
        person('a', 'Thabo', [fav('Metallica', 'urn:entity:artist'), fav('The Dark Knight', 'urn:entity:movie')]),
        person('b', 'Naledi', [fav('Taylor Swift', 'urn:entity:artist'), fav('The Notebook', 'urn:entity:movie')]),
        120,
        [],
        true
      )
  }
];
