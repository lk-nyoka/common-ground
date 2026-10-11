'use client';

import React, { useState } from 'react';
import { CaregiverProfile, TasteEntity } from '../lib/types';
import { generateNextVisitKit } from '../lib/care-logic';
import { Heart, Sparkles, X, Shield, Lock } from 'lucide-react';

interface NewProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProfile: (profile: CaregiverProfile) => void;
}

export function NewProfileModal({ isOpen, onClose, onCreateProfile }: NewProfileModalProps) {
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('1945');
  const [region, setRegion] = useState('');
  const [musicSeed, setMusicSeed] = useState('');
  const [filmSeed, setFilmSeed] = useState('');
  const [foodSeed, setFoodSeed] = useState('');
  const [placeSeed, setPlaceSeed] = useState('');
  const [hobbies, setHobbies] = useState('');
  const [initialAvoid, setInitialAvoid] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const bYear = parseInt(birthYear, 10) || 1945;
    const eraStart = bYear + 12; // early teens
    const eraEnd = bYear + 32;   // young adult peak musical memory period

    const initialNodes: TasteEntity[] = [];

    if (musicSeed.trim()) {
      initialNodes.push({
        id: `seed-music-${Date.now()}`,
        name: musicSeed.trim(),
        domain: 'music',
        year: eraStart + 5,
        sourceSeed: musicSeed.trim(),
        sourceReason: 'Original family memory',
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Initial family favourite'
      });

      // Synthetic Qloo discovery cluster placeholder
      initialNodes.push({
        id: `qloo-disc-1-${Date.now()}`,
        name: `${musicSeed.trim()} Era Contemporary Harmony`,
        domain: 'music',
        year: eraStart + 8,
        sourceSeed: musicSeed.trim(),
        sourceReason: `Discovered by Qloo from ${musicSeed.trim()}`,
        status: 'untested',
        confidence: 'Medium',
        confidenceReason: 'Close Qloo cultural neighbor'
      });
    }

    if (foodSeed.trim()) {
      initialNodes.push({
        id: `seed-food-${Date.now()}`,
        name: foodSeed.trim(),
        domain: 'food',
        year: eraStart,
        sourceSeed: foodSeed.trim(),
        sourceReason: 'Comfort food memory',
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Initial family favourite'
      });
    }

    if (placeSeed.trim()) {
      initialNodes.push({
        id: `seed-place-${Date.now()}`,
        name: placeSeed.trim(),
        domain: 'place',
        year: eraStart + 2,
        sourceSeed: placeSeed.trim(),
        sourceReason: 'Childhood home place',
        status: 'worked',
        confidence: 'High',
        confidenceReason: 'Initial family favourite'
      });
    }

    if (filmSeed.trim()) {
      initialNodes.push({
        id: `seed-film-${Date.now()}`,
        name: filmSeed.trim(),
        domain: 'film',
        year: eraStart + 6,
        sourceSeed: filmSeed.trim(),
        sourceReason: 'Favorite movie memory',
        status: 'untested',
        confidence: 'Medium',
        confidenceReason: 'Initial family favourite'
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

        <div className="flex items-center gap-2 text-amber-700 text-xs font-mono font-semibold uppercase tracking-wider mb-1">
          <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
          <span>Try with Someone You Love</span>
        </div>
        <h3 className="font-serif text-2xl font-bold text-stone-900">
          Tell us 3 things they once loved
        </h3>
        <p className="text-xs text-stone-600 mt-1">
          Back Then uses Qloo to connect their specific favourites to era-appropriate songs, places, and food, and builds your 20-minute visit kit.
        </p>

        {/* Dignity & Privacy Safeguards */}
        <div className="my-4 p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1 text-[11px] text-stone-600">
          <div className="flex items-center gap-1.5 font-bold text-stone-800">
            <Lock className="w-3.5 h-3.5 text-stone-600" />
            <span>Caregiver Dignity & Privacy Safeguards:</span>
          </div>
          <ul className="space-y-0.5 pl-5 list-disc text-stone-600 leading-normal">
            <li>No account required · No login friction</li>
            <li>No medical diagnosis is ever stored</li>
            <li>Session-only by default (deleted when you close the tab)</li>
            <li>Anything marked upsetting is permanently avoided</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-800 mb-1">
                First Name:
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
              placeholder="e.g. Durban, Chicago, rural Yorkshire"
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
                  placeholder="e.g. Nat King Cole, Miriam Makeba, or Aretha Franklin"
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
                    placeholder="e.g. Cinnamon buns, Bobotie, Peach cobbler"
                    value={foodSeed}
                    onChange={(e) => setFoodSeed(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-stone-700 mb-0.5">
                    3. A Place or Landmark:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lake Michigan, Victoria Street Market"
                    value={placeSeed}
                    onChange={(e) => setPlaceSeed(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-stone-200 pt-3">
            <label className="block font-semibold text-rose-900 mb-1">
              Any Topics or Sounds to Avoid (Excluded Permanently):
            </label>
            <input
              type="text"
              placeholder="e.g. Loud brass bands, hospital scenes, heavy rock"
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
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Generate Taste Map & Visit Kit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
