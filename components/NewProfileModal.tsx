'use client';

import React, { useState } from 'react';
import { CaregiverProfile, QlooEntity, TasteEntity } from '../lib/types';
import { mediaLinkFor } from '../lib/care-logic';
import { Heart, Sparkles, X, Lock, ArrowRight, ArrowLeft, Loader2 } from 'lucide-react';

interface NewProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProfile: (profile: CaregiverProfile) => void;
}

type SeedKey = 'music' | 'film' | 'place';

interface Lookup {
  query: string;
  type: string; // Qloo type used for the search ('' = any)
  status: 'loading' | 'done' | 'unavailable';
  results: QlooEntity[];
  source?: 'live' | 'saved' | 'unavailable';
  chosenId: string | null; // null = keep as family memory only
}

const SEARCH_TYPE: Record<SeedKey, string> = {
  music: 'urn:entity:artist',
  film: 'urn:entity:movie',
  place: ''
};

const LABEL: Record<SeedKey, string> = { music: '🎵 Music', film: '🎬 Film', place: '📍 Place' };

export function NewProfileModal({ isOpen, onClose, onCreateProfile }: NewProfileModalProps) {
  const [step, setStep] = useState<'input' | 'confirm'>('input');
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('1948');
  const [region, setRegion] = useState('');
  const [musicSeed, setMusicSeed] = useState('');
  const [filmSeed, setFilmSeed] = useState('');
  const [foodSeed, setFoodSeed] = useState('');
  const [placeSeed, setPlaceSeed] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [initialAvoid, setInitialAvoid] = useState('');
  const [lookups, setLookups] = useState<Partial<Record<SeedKey, Lookup>>>({});

  if (!isOpen) return null;

  const seedValue: Record<SeedKey, string> = { music: musicSeed.trim(), film: filmSeed.trim(), place: placeSeed.trim() };

  const runLookups = async () => {
    const keys = (Object.keys(seedValue) as SeedKey[]).filter((k) => seedValue[k]);
    const initial: Partial<Record<SeedKey, Lookup>> = {};
    for (const k of keys) initial[k] = { query: seedValue[k], type: SEARCH_TYPE[k], status: 'loading', results: [], chosenId: null };
    setLookups(initial);

    await Promise.all(
      keys.map(async (k) => {
        try {
          const params = new URLSearchParams({ query: seedValue[k] });
          if (SEARCH_TYPE[k]) params.set('type', SEARCH_TYPE[k]);
          const res = await fetch(`/api/qloo/search?${params.toString()}`);
          const data = await res.json();
          const results: QlooEntity[] = Array.isArray(data.results) ? data.results.slice(0, 3) : [];
          setLookups((prev) => ({
            ...prev,
            [k]: {
              ...prev[k]!,
              status: data.source === 'unavailable' ? 'unavailable' : 'done',
              source: data.source,
              results,
              chosenId: results[0]?.id ?? null
            }
          }));
        } catch {
          setLookups((prev) => ({ ...prev, [k]: { ...prev[k]!, status: 'unavailable', results: [], chosenId: null } }));
        }
      })
    );
  };

  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicSeed.trim()) return;
    setStep('confirm');
    runLookups();
  };

  const choose = (k: SeedKey, id: string | null) =>
    setLookups((prev) => ({ ...prev, [k]: { ...prev[k]!, chosenId: id } }));

  const anyLoading = Object.values(lookups).some((l) => l?.status === 'loading');
  const qlooDown = Object.values(lookups).length > 0 && Object.values(lookups).every((l) => l?.status === 'unavailable');

  const handleFinalSubmit = () => {
    const bYear = parseInt(birthYear, 10) || 1948;
    const eraStart = bYear + 12;
    const eraEnd = bYear + 30;
    const domainOf: Record<SeedKey, TasteEntity['domain']> = { music: 'music', film: 'film', place: 'place' };
    const nodes: TasteEntity[] = [];

    (Object.keys(seedValue) as SeedKey[]).forEach((k) => {
      const value = seedValue[k];
      if (!value) return;
      const lk = lookups[k];
      const chosen = lk?.results.find((r) => r.id === lk.chosenId);
      const domain = domainOf[k];
      nodes.push({
        id: `seed-${k}-${Date.now()}`,
        name: chosen ? chosen.name : value,
        domain,
        year: chosen?.year && domain !== 'music' ? chosen.year : undefined,
        sourceSeed: value,
        sourceReason: chosen
          ? `Family memory, confirmed in Qloo as "${chosen.name}" (${chosen.type}).`
          : lk?.status === 'unavailable'
          ? 'Family memory. Qloo was not reachable, so it will be looked up once Qloo is connected.'
          : 'Family memory (no Qloo match chosen).',
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Family favourite (no visits logged yet)',
        provenance: 'family',
        qlooEntityId: chosen?.id,
        qlooEntityType: chosen?.type,
        // If Qloo couldn't be reached, let the agent try the lookup later. If the family
        // looked at the matches and chose none, respect that and don't look it up again.
        qlooQuery: !chosen && lk?.status === 'unavailable' ? { query: value, type: SEARCH_TYPE[k] } : undefined,
        mediaLink: mediaLinkFor(chosen ? chosen.name : value, domain)
      });
    });

    if (foodSeed.trim()) {
      nodes.push({
        id: `seed-food-${Date.now()}`,
        name: foodSeed.trim(),
        domain: 'food',
        sourceSeed: foodSeed.trim(),
        sourceReason: 'Family memory. Qloo has no entries for home dishes, so this stays a family memory.',
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Family favourite (no visits logged yet)',
        provenance: 'family'
      });
    }

    const profile: CaregiverProfile = {
      id: `profile-${Date.now()}`,
      lovedOneName: name.trim() || 'your loved one',
      birthYear: bYear,
      homeRegion: region.trim(),
      eraStart,
      eraEnd,
      hobbies: hobbies.trim(),
      seeds: {
        music: musicSeed.trim(),
        film: filmSeed.trim() || undefined,
        food: foodSeed.trim() || undefined,
        place: placeSeed.trim() || undefined
      },
      avoidList: initialAvoid
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean),
      tasteMapNodes: nodes,
      domainStats: {},
      visitHistory: []
    };

    onCreateProfile(profile);
    setStep('input');
    onClose();
  };

  const input = 'w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600';

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 text-amber-800 text-xs font-mono font-bold uppercase tracking-wider mb-1">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span>{step === 'input' ? 'Step 1: Their favourites' : 'Step 2: Confirm the matches in Qloo'}</span>
        </div>

        {step === 'input' ? (
          <div>
            <h3 className="font-serif text-2xl font-bold text-stone-900">Tell us a few things they loved</h3>
            <p className="text-xs text-stone-600 mt-1">
              Back Then looks these up in Qloo, then its agent plans a 20-minute visit kit.
            </p>

            <div className="my-4 p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1 text-[11px] text-stone-600">
              <div className="flex items-center gap-1.5 font-bold text-stone-800">
                <Lock className="w-3.5 h-3.5 text-stone-600" />
                <span>Privacy</span>
              </div>
              <ul className="space-y-0.5 pl-5 list-disc leading-normal">
                <li>No account needed, and no diagnosis is stored.</li>
                <li>Entries live only in this browser tab and are gone when you leave.</li>
                <li>The name and birth year never leave this app. Qloo and the planning agent see only the favourites, region, hobbies and era.</li>
              </ul>
            </div>

            <form onSubmit={handleProceedToConfirmation} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">First name (stays in this app):</label>
                  <input type="text" required placeholder="e.g. Margaret or Dad" value={name} onChange={(e) => setName(e.target.value)} className={input} />
                </div>
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Approximate birth year:</label>
                  <input type="number" required min={1910} max={1975} value={birthYear} onChange={(e) => setBirthYear(e.target.value)} className={input} />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-800 mb-1">Where they grew up:</label>
                <input type="text" placeholder="e.g. Soweto, Ohio, Yorkshire" value={region} onChange={(e) => setRegion(e.target.value)} className={input} />
              </div>

              <div className="border-t border-stone-200 pt-3 space-y-2.5">
                <div>
                  <label className="block text-stone-700 mb-0.5">A favourite singer or band (required):</label>
                  <input type="text" required placeholder="e.g. Miriam Makeba, Patsy Cline" value={musicSeed} onChange={(e) => setMusicSeed(e.target.value)} className={input} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-stone-700 mb-0.5">A film or musical:</label>
                    <input type="text" placeholder="e.g. The Sound of Music" value={filmSeed} onChange={(e) => setFilmSeed(e.target.value)} className={input} />
                  </div>
                  <div>
                    <label className="block text-stone-700 mb-0.5">A place from their youth:</label>
                    <input type="text" placeholder="e.g. Sophiatown, Lake Erie" value={placeSeed} onChange={(e) => setPlaceSeed(e.target.value)} className={input} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-stone-700 mb-0.5">A comfort dish:</label>
                    <input type="text" placeholder="e.g. Umngqusho, apple pie" value={foodSeed} onChange={(e) => setFoodSeed(e.target.value)} className={input} />
                  </div>
                  <div>
                    <label className="block text-stone-700 mb-0.5">Hobbies:</label>
                    <input type="text" placeholder="e.g. church choir, gardening" value={hobbies} onChange={(e) => setHobbies(e.target.value)} className={input} />
                  </div>
                </div>
              </div>

              <div className="border-t border-stone-200 pt-3">
                <label className="block font-semibold text-rose-900 mb-1">Things to avoid (comma separated, never suggested):</label>
                <input
                  type="text"
                  placeholder="e.g. sirens, hospital scenes"
                  value={initialAvoid}
                  onChange={(e) => setInitialAvoid(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-rose-200 bg-rose-50/40 focus:outline-none focus:border-rose-400 placeholder-stone-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium">
                  Cancel
                </button>
                <button type="submit" className="px-6 py-2.5 bg-stone-950 hover:bg-stone-800 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-2">
                  <span>Look them up in Qloo</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <h3 className="font-serif text-2xl font-bold text-stone-900">Is this who you meant?</h3>
            <p className="text-xs text-stone-600">
              These are Qloo&apos;s matches for what you typed. Pick the right one, or keep it as a family memory only.
            </p>

            {qlooDown && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                Qloo isn&apos;t connected right now, so these stay as family memories. The agent will look them up once Qloo is connected. No discoveries will be made up in the meantime.
              </div>
            )}

            <div className="space-y-3 p-3 bg-stone-50 border border-stone-200 rounded-xl">
              {(Object.keys(lookups) as SeedKey[]).map((k) => {
                const lk = lookups[k]!;
                return (
                  <div key={k} className="p-3 bg-white rounded-lg border border-stone-200 space-y-1.5">
                    <div className="font-bold text-stone-900">
                      {LABEL[k]}: &ldquo;{lk.query}&rdquo;
                      {lk.source === 'saved' && <span className="ml-2 text-[10px] font-mono text-sky-800">(saved Qloo response)</span>}
                    </div>
                    {lk.status === 'loading' && (
                      <div className="flex items-center gap-1.5 text-stone-500">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching Qloo…
                      </div>
                    )}
                    {lk.status === 'done' && lk.results.length === 0 && <div className="text-stone-500">Qloo found no match. It will stay a family memory.</div>}
                    {lk.status === 'done' &&
                      lk.results.map((r) => (
                        <label key={r.id} className="flex items-start gap-2 cursor-pointer">
                          <input type="radio" name={`pick-${k}`} checked={lk.chosenId === r.id} onChange={() => choose(k, r.id)} className="mt-0.5" />
                          <span>
                            <span className="font-semibold text-stone-900">{r.name}</span>
                            <span className="text-stone-500">
                              {' '}
                              · {r.type.replace('urn:entity:', '')}
                              {r.year ? ` · ${r.year}` : ''}
                            </span>
                            {r.description && <span className="block text-[11px] text-stone-500">{r.description}</span>}
                          </span>
                        </label>
                      ))}
                    {lk.status === 'done' && lk.results.length > 0 && (
                      <label className="flex items-center gap-2 cursor-pointer text-stone-600">
                        <input type="radio" name={`pick-${k}`} checked={lk.chosenId === null} onChange={() => choose(k, null)} />
                        <span>None of these: keep it as a family memory only</span>
                      </label>
                    )}
                    {lk.status === 'unavailable' && <div className="text-stone-500">Qloo not reachable. Kept as a family memory for now.</div>}
                  </div>
                );
              })}
              {foodSeed.trim() && (
                <div className="p-3 bg-white rounded-lg border border-stone-200 text-stone-600">
                  🍲 Food: &ldquo;{foodSeed.trim()}&rdquo;. Qloo has no entries for home dishes, so it stays a family memory.
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button type="button" onClick={() => setStep('input')} className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={anyLoading}
                className="px-6 py-2.5 bg-stone-950 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Plan the visit</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
