'use client';

import React, { useState } from 'react';
import { SAMPLE_NOMVULA_PROFILE, SAMPLE_DOROTHY_PROFILE } from '../lib/sample-data';
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
  BookOpen, 
  CheckCircle2, 
  RotateCcw,
  Shield, 
  Users
} from 'lucide-react';

export default function HomePage() {
  const [profile, setProfile] = useState<CaregiverProfile>(SAMPLE_NOMVULA_PROFILE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'visit_kit' | 'learning'>('map');
  const [hasLoggedVisit, setHasLoggedVisit] = useState(false);

  const handleSelectSample = (type: 'nomvula' | 'dorothy') => {
    setProfile(type === 'nomvula' ? SAMPLE_NOMVULA_PROFILE : SAMPLE_DOROTHY_PROFILE);
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
    setProfile(SAMPLE_NOMVULA_PROFILE);
    setHasLoggedVisit(false);
    setActiveTab('map');
  };

  return (
    <main className="min-h-screen bg-[#FDFCF7] text-stone-900 pb-20">
      {/* Top Banner / Problem Anchor */}
      <header className="border-b border-stone-200/80 bg-white/70 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-800 flex items-center justify-center font-serif font-black text-lg">
              B
            </div>
            <div>
              <span className="font-serif font-bold text-lg text-stone-900 tracking-tight">
                Back Then
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
                Qloo Agentic Hackathon
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-600 hidden md:inline">
              Currently viewing:
            </span>
            <div className="inline-flex rounded-lg bg-stone-100 p-0.5 text-xs font-medium">
              <button
                onClick={() => handleSelectSample('nomvula')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  profile.id === 'profile-nomvula'
                    ? 'bg-white shadow-2xs text-stone-900 font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Nomvula (Soweto, 1948)
              </button>
              <button
                onClick={() => handleSelectSample('dorothy')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  profile.id === 'profile-dorothy'
                    ? 'bg-white shadow-2xs text-stone-900 font-bold'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Dorothy (Ohio, 1946)
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 pb-8 text-center space-y-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 text-amber-900 text-xs font-semibold tracking-wide border border-amber-200">
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>Taste-Detective Agent for Dementia Visits</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-black text-stone-950 tracking-tight leading-tight max-w-3xl mx-auto">
          You remember three songs. Back Then finds what comes next.
        </h1>

        <p className="text-stone-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          Families don’t lack content; they lack knowing what to try next when the same three favourites run dry. Back Then uses <strong>Qloo</strong> to map era-appropriate cultural links, builds on-demand visit kits, and learns from every visit what still reaches them.
        </p>

        {/* The Two Doors */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => {
              setActiveTab('visit_kit');
            }}
            className="w-full sm:w-auto px-6 py-3 bg-stone-950 hover:bg-stone-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Door 1: "I'm Visiting in 20 Minutes" (45s Demo)</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-stone-100 text-stone-900 border border-stone-300 rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition-all flex items-center justify-center gap-2"
          >
            <Heart className="w-4 h-4 text-rose-500" />
            <span>Door 2: Try with Someone You Love (2 Mins)</span>
          </button>
        </div>

        {/* Small Print Guarantees */}
        <div className="text-[11px] text-stone-500 flex flex-wrap items-center justify-center gap-4 pt-1">
          <span>• No account needed</span>
          <span>• No diagnosis is stored</span>
          <span>• Deleted on leave</span>
          <span>• Permanent avoid list</span>
        </div>
      </section>

      {/* Main Interactive Work Area */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-stone-200 mb-6 gap-2 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('map')}
            className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'map'
                ? 'border-stone-900 text-stone-950 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>Living Taste Map</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </button>

          <button
            onClick={() => setActiveTab('visit_kit')}
            className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === 'visit_kit'
                ? 'border-stone-900 text-stone-950 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <span>Visit Mode Kit</span>
            <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded text-[10px]">
              Ready
            </span>
          </button>

          {hasLoggedVisit && (
            <button
              onClick={() => setActiveTab('learning')}
              className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === 'learning'
                  ? 'border-stone-900 text-stone-950 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <span>Agent Learning & Adaptation</span>
              <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-900 rounded text-[10px]">
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

            <div className="p-4 bg-white border border-stone-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-serif font-bold text-sm text-stone-900">
                  Ready to visit {profile.lovedOneName}?
                </h4>
                <p className="text-xs text-stone-600">
                  Generate the structured 20-minute bedside kit with 2 proven items, 1 Qloo discovery, and 1 careful experiment.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('visit_kit')}
                className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shrink-0"
              >
                <span>Open Visit Kit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: The Visit Kit View */}
        {activeTab === 'visit_kit' && (
          <div className="space-y-6">
            <VisitKitView
              kit={profile.currentKit}
              lovedOneName={profile.lovedOneName}
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
                className="px-5 py-2.5 bg-stone-200 hover:bg-stone-300 text-stone-900 rounded-xl text-xs font-semibold transition-colors"
              >
                Return to Living Taste Map (See New Node Colours)
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
