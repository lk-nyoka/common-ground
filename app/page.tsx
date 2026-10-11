'use client';

import React, { useState } from 'react';
import { 
  SAMPLE_MARGARET_PROFILE, 
  SAMPLE_ROSA_PROFILE, 
  SAMPLE_SUSAN_PROFILE, 
  SAMPLE_ANNA_PROFILE, 
  SAMPLE_NOMVULA_PROFILE 
} from '../lib/sample-data';
import { CaregiverProfile, ReactionType } from '../lib/types';
import { recordVisitReactions } from '../lib/care-logic';
import { TasteMap } from '../components/TasteMap';
import { VisitKitView } from '../components/VisitKitView';
import { BeforeAfterComparison } from '../components/BeforeAfterComparison';
import { NewProfileModal } from '../components/NewProfileModal';
import { 
  Sparkles, 
  Heart, 
  Clock, 
  ArrowRight, 
  Lock, 
  Users,
  Compass,
  FileCheck
} from 'lucide-react';

export default function HomePage() {
  const [profile, setProfile] = useState<CaregiverProfile>(SAMPLE_MARGARET_PROFILE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'visit_kit' | 'learning'>('map');
  const [hasLoggedVisit, setHasLoggedVisit] = useState(false);

  const sampleProfiles = [
    { id: 'profile-margaret', name: 'Margaret (England, 1946)', profile: SAMPLE_MARGARET_PROFILE },
    { id: 'profile-rosa', name: 'Rosa (Italy, 1950)', profile: SAMPLE_ROSA_PROFILE },
    { id: 'profile-susan', name: 'Susan (USA, 1952)', profile: SAMPLE_SUSAN_PROFILE },
    { id: 'profile-anna', name: 'Anna (Sweden, 1955)', profile: SAMPLE_ANNA_PROFILE },
    { id: 'profile-nomvula', name: 'Nomvula (S. Africa, 1948)', profile: SAMPLE_NOMVULA_PROFILE }
  ];

  const handleSelectSample = (prof: CaregiverProfile) => {
    setProfile(prof);
    setHasLoggedVisit(false);
    setActiveTab('map');
  };

  const handleLogReactions = (reactions: Record<string, ReactionType>, note?: string) => {
    const updated = recordVisitReactions(profile, reactions, note);
    setProfile(updated);
    setHasLoggedVisit(true);
    setActiveTab('learning');
  };

  const handleResetDemo = () => {
    setProfile(SAMPLE_MARGARET_PROFILE);
    setHasLoggedVisit(false);
    setActiveTab('map');
  };

  return (
    <main className="min-h-screen bg-[#FDFCF7] text-stone-900 pb-24">
      {/* Top Banner / Problem Header */}
      <header className="border-b border-stone-200/90 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-serif font-black text-lg border border-amber-300/60">
              B
            </div>
            <div>
              <span className="font-serif font-black text-lg text-stone-950 tracking-tight">
                Back Then
              </span>
              <span className="ml-2 text-[11px] font-mono font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200">
                Qloo Agentic Hackathon
              </span>
            </div>
          </div>

          {/* Sample Profile Switcher for Judges */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 md:pb-0">
            <span className="text-[11px] font-mono text-stone-500 font-semibold whitespace-nowrap">
              Judge Profiles:
            </span>
            <div className="inline-flex rounded-xl bg-stone-100 p-1 text-xs font-semibold gap-1">
              {sampleProfiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectSample(p.profile)}
                  className={`px-2.5 py-1 rounded-lg transition-all whitespace-nowrap text-[11px] ${
                    profile.id === p.id
                      ? 'bg-white shadow-2xs text-stone-950 font-bold border border-stone-200/60'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 pb-8 text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/80 text-amber-900 text-xs font-bold tracking-wide border border-amber-300">
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>Taste-Detective Agent for Dementia Visits</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-black text-stone-950 tracking-tight leading-tight max-w-3xl mx-auto">
          You remember three songs. Back Then finds what comes next.
        </h1>

        <p className="text-stone-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-sans">
          Families don’t lack content; streaming sites have almost every old song. What they lack is knowing <strong>what to try next</strong> once the same three favourites stop working. Back Then uses <strong>Qloo’s Cultural AI</strong> to link favourites across music, film, food, and places, then learns from every visit what still reaches that person.
        </p>

        {/* The Two Doors (5-Second Explanation) */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            onClick={() => setActiveTab('visit_kit')}
            className="w-full sm:w-auto px-7 py-3.5 bg-stone-950 hover:bg-stone-800 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 group"
          >
            <Clock className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>Door 1: "I'm Visiting in 20 Minutes" (45s Demo)</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-stone-100 text-stone-900 border border-stone-300 rounded-2xl text-xs sm:text-sm font-bold shadow-2xs transition-all flex items-center justify-center gap-2"
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>Door 2: Try with Someone You Love (2 Mins)</span>
          </button>
        </div>

        {/* Dignity & Privacy Micro-Copy */}
        <div className="text-[11px] text-stone-500 flex flex-wrap items-center justify-center gap-4 pt-1 font-medium">
          <span>• No account needed</span>
          <span>• No medical diagnosis stored</span>
          <span>• Deleted when you leave</span>
          <span>• Permanent avoid list filter</span>
        </div>
      </section>

      {/* Main Interactive Work Area */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 mb-6 gap-2 text-xs font-bold">
          <button
            onClick={() => setActiveTab('map')}
            className={`pb-3 px-4 transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'map'
                ? 'border-stone-900 text-stone-950 font-black'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>1. Living Taste Map</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </button>

          <button
            onClick={() => setActiveTab('visit_kit')}
            className={`pb-3 px-4 transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'visit_kit'
                ? 'border-stone-900 text-stone-950 font-black'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>2. Visit Mode Kit</span>
            <span className="px-1.5 py-0.2 bg-amber-200/70 text-amber-900 rounded text-[10px]">
              Ready
            </span>
          </button>

          {hasLoggedVisit && (
            <button
              onClick={() => setActiveTab('learning')}
              className={`pb-3 px-4 transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'learning'
                  ? 'border-stone-900 text-stone-950 font-black'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>3. Agent Learning & Adaptation</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 rounded text-[10px] font-bold">
                Updated
              </span>
            </button>
          )}
        </div>

        {/* Tab 1: The Living Taste Map */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            <TasteMap
              nodes={profile.tasteMapNodes}
              lovedOneName={profile.lovedOneName}
              eraStart={profile.eraStart}
              eraEnd={profile.eraEnd}
            />

            <div className="p-5 bg-white border border-stone-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <h4 className="font-serif font-black text-base text-stone-900">
                  Ready to visit {profile.lovedOneName}?
                </h4>
                <p className="text-xs text-stone-600 mt-0.5">
                  Generate the 20-minute kit with 2 proven items, 1 Qloo discovery, and 1 careful hypothesis experiment.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('visit_kit')}
                className="px-6 py-3 bg-stone-950 hover:bg-stone-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shrink-0 shadow-sm"
              >
                <span>Open Visit Kit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: The Visit Kit View */}
        {activeTab === 'visit_kit' && (
          <div className="space-y-6">
            <VisitKitView
              kit={profile.currentKit}
              profile={profile}
              onLogReactions={handleLogReactions}
            />
          </div>
        )}

        {/* Tab 3: Before & After Agent Learning Reflection */}
        {activeTab === 'learning' && (
          <div className="space-y-6">
            <BeforeAfterComparison
              previousKit={profile.previousKit || profile.currentKit}
              nextKit={profile.currentKit}
              latestLog={profile.visitHistory[0]}
              lovedOneName={profile.lovedOneName}
              onResetDemo={handleResetDemo}
            />

            <div className="pt-4 text-center">
              <button
                onClick={() => setActiveTab('map')}
                className="px-6 py-3 bg-stone-200 hover:bg-stone-300 text-stone-900 rounded-xl text-xs font-bold transition-all"
              >
                Return to Living Taste Map (See Map Change Colour)
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Modal for "Try with someone you love" */}
      <NewProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreateProfile={(newProf) => {
          setProfile(newProf);
          setHasLoggedVisit(false);
          setActiveTab('map');
        }}
      />
    </main>
  );
}
