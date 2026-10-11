'use client';

import React, { useState } from 'react';
import { CaregiverProfile, TasteEntity, EntityDisambiguationOption } from '../lib/types';
import { generateNextVisitKit } from '../lib/care-logic';
import { Heart, Sparkles, X, Shield, Lock, CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';

interface NewProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProfile: (profile: CaregiverProfile) => void;
}

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

  // Disambiguation selections
  const [confirmedTypes, setConfirmedTypes] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicSeed.trim()) return;

    // Set initial default disambiguations
    const initialConf: Record<string, string> = {
      [musicSeed.trim()]: 'urn:entity:artist',
    };
    if (filmSeed.trim()) initialConf[filmSeed.trim()] = 'urn:entity:movie';
    if (placeSeed.trim()) initialConf[placeSeed.trim()] = 'urn:entity:place';
    if (foodSeed.trim()) initialConf[foodSeed.trim()] = 'taste:comfort_dish';

    setConfirmedTypes(initialConf);
    setStep('confirm');
  };

  const handleFinalSubmit = () => {
    const bYear = parseInt(birthYear, 10) || 1948;
    const eraStart = bYear + 12;
    const eraEnd = bYear + 30;

    const initialNodes: TasteEntity[] = [];

    // Music seed
    const musicType = confirmedTypes[musicSeed.trim()] || 'urn:entity:artist';
    initialNodes.push({
      id: `seed-music-${Date.now()}`,
      name: musicSeed.trim(),
      domain: 'music',
      year: eraStart + 5,
      sourceSeed: musicSeed.trim(),
      sourceReason: `Caregiver confirmed as ${musicType}`,
      status: 'worked',
      confidence: 'High',
      confidenceReason: 'Initial family favourite',
      provenance: 'placeholder',
      qlooEntityType: musicType,
      mediaLink: {
        platform: 'youtube',
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(musicSeed.trim())}`,
        label: 'Search on YouTube'
      }
    });

    // Qloo discovery placeholder (clearly marked)
    initialNodes.push({
      id: `disc-1-${Date.now()}`,
      name: `${musicSeed.trim()} Era Contemporary Vocalist`,
      domain: 'music',
      year: eraStart + 8,
      sourceSeed: musicSeed.trim(),
      sourceReason: `People with affinity for ${musicSeed.trim()} frequently associate with contemporary vocal peers`,
      status: 'untested',
      confidence: 'Medium',
      confidenceReason: 'Cultural affinity match',
      provenance: 'placeholder',
      qlooEntityType: 'urn:entity:artist',
      mediaLink: {
        platform: 'spotify',
        url: `https://open.spotify.com/search/${encodeURIComponent(musicSeed.trim())}`,
        label: 'Search on Spotify'
      }
    });

    if (placeSeed.trim()) {
      const placeType = confirmedTypes[placeSeed.trim()] || 'urn:entity:place';
      initialNodes.push({
        id: `seed-place-${Date.now()}`,
        name: placeSeed.trim(),
        domain: 'place',
        year: eraStart + 2,
        sourceSeed: placeSeed.trim(),
        sourceReason: `Caregiver confirmed as ${placeType}`,
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Initial family favourite',
        provenance: 'placeholder',
        qlooEntityType: placeType,
        mediaLink: {
          platform: 'youtube',
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(placeSeed.trim() + ' historical footage')}`,
          label: 'Search on YouTube'
        }
      });
    }

    if (foodSeed.trim()) {
      initialNodes.push({
        id: `seed-food-${Date.now()}`,
        name: foodSeed.trim(),
        domain: 'food',
        year: eraStart,
        sourceSeed: foodSeed.trim(),
        sourceReason: 'Comfort aroma memory',
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Initial family favourite',
        provenance: 'placeholder'
      });
    }

    if (filmSeed.trim()) {
      const filmType = confirmedTypes[filmSeed.trim()] || 'urn:entity:movie';
      initialNodes.push({
        id: `seed-film-${Date.now()}`,
        name: filmSeed.trim(),
        domain: 'film',
        year: eraStart + 6,
        sourceSeed: filmSeed.trim(),
        sourceReason: `Caregiver confirmed as ${filmType}`,
        status: 'untested',
        confidence: 'Medium',
        confidenceReason: 'Initial family favourite',
        provenance: 'placeholder',
        qlooEntityType: filmType
      });
    }

    const avoidList: string[] = [];
    if (initialAvoid.trim()) {
      avoidList.push(initialAvoid.trim());
    }

    const newProfile: CaregiverProfile = {
      id: `profile-${Date.now()}`,
      lovedOneName: name.trim() || 'Your Loved One',
      birthYear: bYear,
      homeRegion: region.trim() || 'Home Region',
      eraStart,
      eraEnd,
      hobbies: hobbies.trim(),
      seeds: {
        music: musicSeed.trim(),
        film: filmSeed.trim() || undefined,
        food: foodSeed.trim() || undefined,
        place: placeSeed.trim() || undefined
      },
      avoidList,
      currentKit: {} as any,
      tasteMapNodes: initialNodes,
      domainStats: {
        musicLitUpCount: 1,
        filmLitUpCount: 0,
        foodLitUpCount: 0,
        placeLitUpCount: 0
      },
      visitHistory: []
    };

    newProfile.currentKit = generateNextVisitKit(newProfile);
    onCreateProfile(newProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-8">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 text-amber-800 text-xs font-mono font-bold uppercase tracking-wider mb-1">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span>
            {step === 'input' ? 'Step 1: Enter Memories' : 'Step 2: Confirm Cultural Entities (Qloo Disambiguation)'}
          </span>
        </div>

        {step === 'input' ? (
          <div>
            <h3 className="font-serif text-2xl font-bold text-stone-900">
              Tell us 3 things they once loved
            </h3>
            <p className="text-xs text-stone-600 mt-1">
              Back Then searches Qloo for cultural entities and builds your 20-minute bedside visit kit.
            </p>

            {/* Dignity & Privacy Safeguards */}
            <div className="my-4 p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1 text-[11px] text-stone-600">
              <div className="flex items-center gap-1.5 font-bold text-stone-800">
                <Lock className="w-3.5 h-3.5 text-stone-600" />
                <span>Caregiver Dignity & Privacy Safeguards:</span>
              </div>
              <ul className="space-y-0.5 pl-5 list-disc text-stone-600 leading-normal">
                <li>No account required · No login friction</li>
                <li>No medical diagnosis is stored</li>
                <li>Session-only by default (deleted on leave)</li>
                <li>Personal names are kept on-device and never sent to Qloo</li>
              </ul>
            </div>

            <form onSubmit={handleProceedToConfirmation} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">
                    First Name (kept on-device only):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Margaret or Dad"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">
                    Approximate Birth Year:
                  </label>
                  <input
                    type="number"
                    required
                    min={1910}
                    max={1970}
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Home Region / City Growing Up:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Soweto, Ohio, Yorkshire, Rome"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="border-t border-stone-200 pt-3">
                <span className="font-serif font-bold text-stone-900 block mb-2">
                  The 3 Memories You Remember:
                </span>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-stone-700 mb-0.5">
                      1. A Favourite Singer, Band or Song (Required):
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Miriam Makeba, Patsy Cline, or Aretha Franklin"
                      value={musicSeed}
                      onChange={(e) => setMusicSeed(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-stone-700 mb-0.5">
                        2. A Comfort Dish or Flavour:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Umngqusho, Apple pie, Sunday roast"
                        value={foodSeed}
                        onChange={(e) => setFoodSeed(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-700 mb-0.5">
                        3. A Childhood Place or Town:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sophiatown, Lake Erie, Blackpool"
                        value={placeSeed}
                        onChange={(e) => setPlaceSeed(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-700 mb-0.5">
                      4. A Film or Musical (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Come Back Africa, The Sound of Music, Casablanca"
                      value={filmSeed}
                      onChange={(e) => setFilmSeed(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-stone-200 pt-3">
                <label className="block font-semibold text-rose-900 mb-1">
                  Topics to Avoid (Permanently Excluded from All Future Visits):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Police sirens, hospital scenes, loud rock"
                  value={initialAvoid}
                  onChange={(e) => setInitialAvoid(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-rose-200 bg-rose-50/40 focus:outline-none focus:border-rose-400 placeholder-stone-400"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-stone-950 hover:bg-stone-800 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-2"
                >
                  <span>Resolve Entities in Qloo</span>
                  <ArrowRight className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Step 2: Disambiguation & Entity Confirmation */
          <div className="space-y-4 text-xs">
            <h3 className="font-serif text-2xl font-bold text-stone-900">
              Confirm Identified Cultural Entities
            </h3>
            <p className="text-xs text-stone-600">
              Qloo differentiates entities by type (e.g. musician vs film appearance). Please confirm the intended matches below before the agent expands them:
            </p>

            <div className="space-y-3 p-3 bg-stone-50 border border-stone-200 rounded-xl">
              {/* Music Seed Disambiguation */}
              <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-900 text-xs">
                    🎵 Music: "{musicSeed}"
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmedTypes((prev) => ({ ...prev, [musicSeed]: 'urn:entity:artist' }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
                      confirmedTypes[musicSeed] === 'urn:entity:artist'
                        ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    Musician / Performing Artist (`urn:entity:artist`)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmedTypes((prev) => ({ ...prev, [musicSeed]: 'urn:entity:song' }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
                      confirmedTypes[musicSeed] === 'urn:entity:song'
                        ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                        : 'bg-stone-50 border-stone-200 text-stone-600'
                    }`}
                  >
                    Specific Song / Track
                  </button>
                </div>
              </div>

              {/* Place Seed Disambiguation */}
              {placeSeed && (
                <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-xs">
                      📍 Place: "{placeSeed}"
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmedTypes((prev) => ({ ...prev, [placeSeed]: 'urn:entity:place' }))}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
                        confirmedTypes[placeSeed] === 'urn:entity:place'
                          ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      Locality / Suburb (`urn:entity:place`)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmedTypes((prev) => ({ ...prev, [placeSeed]: 'urn:entity:destination' }))}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
                        confirmedTypes[placeSeed] === 'urn:entity:destination'
                          ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      Travel Destination (`urn:entity:destination`)
                    </button>
                  </div>
                </div>
              )}

              {/* Film Seed Disambiguation */}
              {filmSeed && (
                <div className="p-3 bg-white rounded-lg border border-stone-200 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-stone-900 text-xs">
                      🎬 Film: "{filmSeed}"
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmedTypes((prev) => ({ ...prev, [filmSeed]: 'urn:entity:movie' }))}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
                        confirmedTypes[filmSeed] === 'urn:entity:movie'
                          ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      Feature Film (`urn:entity:movie`)
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmedTypes((prev) => ({ ...prev, [filmSeed]: 'urn:entity:tv_show' }))}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border ${
                        confirmedTypes[filmSeed] === 'urn:entity:tv_show'
                          ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                          : 'bg-stone-50 border-stone-200 text-stone-600'
                      }`}
                    >
                      Television Broadcast (`urn:entity:tv_show`)
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Seeds</span>
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                className="px-6 py-2.5 bg-stone-950 hover:bg-stone-800 text-white rounded-xl font-bold shadow-md transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Confirm & Generate Kit</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
