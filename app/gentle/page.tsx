'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { SAMPLE_NOMVULA_PROFILE, SAMPLE_DOROTHY_PROFILE } from '../../lib/sample-data';
import { CaregiverProfile, ReactionType } from '../../lib/types';
import { TasteMap } from '../../components/TasteMap';
import { VisitKitView } from '../../components/VisitKitView';
import { BeforeAfterComparison } from '../../components/BeforeAfterComparison';
import { NewProfileModal } from '../../components/NewProfileModal';
import { MemoryPortrait } from '../../components/MemoryPortrait';
import {
  Sparkles,
  Heart,
  Clock,
  ArrowRight,
  Compass,
  Loader2,
  AlertTriangle
} from 'lucide-react';

const STORE_KEY = 'backthen:session:v1';

/** Keep the profile across a page refresh. sessionStorage clears when the tab closes. */
function saveSession(value: unknown) {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify(value));
  } catch {
    /* storage unavailable: carry on without it */
  }
}

function loadSession(): { profile: CaregiverProfile; hasLoggedVisit: boolean } | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.profile?.currentKit ? parsed : null;
  } catch {
    return null;
  }
}

interface ConnectionStatus {
  qloo: { keySet: boolean; savedResponses: number };
  llm: { configured: boolean; model: string | null };
}

async function postJson(url: string, body: unknown): Promise<{ profile: CaregiverProfile }> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export default function HomePage() {
  const [profile, setProfile] = useState<CaregiverProfile>(SAMPLE_NOMVULA_PROFILE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'visit_kit' | 'learning'>('map');
  const [hasLoggedVisit, setHasLoggedVisit] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);

  const sampleProfiles = [
    { id: 'profile-nomvula', name: 'Nomvula (Soweto, 1948)', profile: SAMPLE_NOMVULA_PROFILE },
    { id: 'profile-dorothy', name: 'Dorothy (Ohio, 1946)', profile: SAMPLE_DOROTHY_PROFILE }
  ];

  /** Ask the agent to plan a kit for this profile (it calls Qloo, and the LLM if configured). */
  const planFor = useCallback(async (prof: CaregiverProfile) => {
    setProfile(prof);
    setBusy('The agent is looking up favourites in Qloo and planning the visit…');
    setError(null);
    try {
      const data = await postJson('/api/agent/generate-kit', { profile: prof });
      setProfile(data.profile);
    } catch (err: any) {
      setError(err?.message || 'Planning failed');
    } finally {
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => setStatus(null));
    const saved = loadSession();
    if (saved) {
      setProfile(saved.profile);
      setHasLoggedVisit(saved.hasLoggedVisit);
    } else {
      planFor(SAMPLE_NOMVULA_PROFILE);
    }
  }, [planFor]);

  useEffect(() => {
    if (profile.currentKit) saveSession({ profile, hasLoggedVisit });
  }, [profile, hasLoggedVisit]);

  const handleSelectSample = (prof: CaregiverProfile) => {
    setHasLoggedVisit(false);
    setActiveTab('map');
    planFor(prof);
  };

  const handleLogReactions = async (reactions: Record<string, ReactionType>, note?: string) => {
    setBusy('Recording reactions and planning the next visit…');
    setError(null);
    try {
      const data = await postJson('/api/agent/log-reactions', { profile, reactions, note });
      setProfile(data.profile);
      setHasLoggedVisit(true);
      setActiveTab('learning');
    } catch (err: any) {
      setError(err?.message || 'Could not record reactions');
    } finally {
      setBusy(null);
    }
  };

  const handleResetDemo = () => {
    setHasLoggedVisit(false);
    setActiveTab('map');
    planFor(SAMPLE_NOMVULA_PROFILE);
  };

  const kit = profile.currentKit;
  const sampleVisits = profile.visitHistory.filter((v) => v.isSample).length;
  const todayVisits = profile.visitHistory.length - sampleVisits;
  const qlooLabel = !status
    ? 'Checking…'
    : status.qloo.keySet
    ? 'Qloo: live'
    : status.qloo.savedResponses > 0
    ? `Qloo: ${status.qloo.savedResponses} saved responses`
    : 'Qloo: not connected';
  const agentLabel = !status ? '' : status.llm.configured ? `Agent: ${status.llm.model}` : 'Agent: rules only';

  return (
    <main className="min-h-screen bg-[#FDFCF7] text-stone-900 pb-24">
      {/* Top Banner / Problem Header */}
      <header className="border-b border-stone-200/90 bg-white/80 backdrop-blur-md sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center font-serif font-black text-lg border border-amber-300/60">
              B
            </div>
            <div>
              <a href="/" className="block text-[11px] text-stone-500 hover:text-stone-800">← Common Ground</a>
              <span className="font-serif font-black text-lg text-stone-950 tracking-tight">
                Gentle visit
              </span>
              <span className="hidden md:inline ml-2 text-[11px] font-mono font-bold text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200">
                Qloo Agentic Hackathon
              </span>
              <span className="hidden sm:inline ml-2 text-[10px] font-mono text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                {qlooLabel}{agentLabel ? ` · ${agentLabel}` : ''}
              </span>
            </div>
          </div>

          {/* Sample Profile Switcher for Judges (2 Profiles Only) */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-stone-500 font-semibold hidden md:inline">
              Sample families:
            </span>
            <div className="inline-flex rounded-xl bg-stone-100 p-1 text-xs font-semibold gap-1">
              {sampleProfiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelectSample(p.profile)}
                  className={`px-3 py-1 rounded-lg transition-all text-[11px] ${
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
          <span>A visit-planning agent for dementia care</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-5xl font-black text-stone-950 tracking-tight leading-tight max-w-3xl mx-auto">
          You remember three songs. Gentle visit finds what comes next.
        </h1>

        <p className="text-stone-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-sans">
          <strong>Qloo</strong> finds culturally connected possibilities. Your reactions teach Gentle visit which ones still reach this person.
        </p>
        <p className="text-stone-500 text-xs max-w-xl mx-auto leading-relaxed">
          Experimental. A reminiscence aid for families, not medical advice or treatment. Stop anything that causes distress, and follow the care team’s guidance.
        </p>

        {/* The Two Doors (5-Second Explanation) */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <button
            onClick={() => setActiveTab('visit_kit')}
            className="w-full sm:w-auto px-7 py-3.5 bg-stone-950 hover:bg-stone-800 text-white rounded-2xl text-xs sm:text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 group"
          >
            <Clock className="w-4 h-4 text-amber-400 group-hover:rotate-12 transition-transform" />
            <span>I&apos;m visiting in 20 minutes</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full sm:w-auto px-7 py-3.5 bg-white hover:bg-stone-100 text-stone-900 border border-stone-300 rounded-2xl text-xs sm:text-sm font-bold shadow-2xs transition-all flex items-center justify-center gap-2"
          >
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <span>Try it with someone you love</span>
          </button>
        </div>

        {/* Honest Safeguards */}
        <div className="text-[11px] text-stone-500 flex flex-wrap items-center justify-center gap-4 pt-1 font-medium">
          <span>No account · No diagnosis stored · Names stay in this app · Cleared when you close the tab</span>
        </div>
      </section>

      {/* Main Interactive Work Area */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        {busy && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{busy}</span>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        {profile.isSample && (
          <div className="mb-4 inline-flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-[11px] font-semibold text-sky-900">
            <span>Sample family</span>
            <span>·</span>
            <span>{sampleVisits > 0 ? `${sampleVisits} sample visits, reactions are illustrative` : 'no visits yet'}</span>
            {todayVisits > 0 && (
              <>
                <span>·</span>
                <span>{todayVisits} logged by you just now</span>
              </>
            )}
          </div>
        )}
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
            <span className="hidden sm:inline">1. Living Taste Map</span>
            <span className="sm:hidden">Map</span>
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
            <span className="hidden sm:inline">2. Visit Mode Kit</span>
            <span className="sm:hidden">Visit kit</span>
            {kit && !busy && (
              <span className="px-1.5 py-0.2 bg-amber-200/70 text-amber-900 rounded text-[10px]">
                Ready
              </span>
            )}
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
              <span className="hidden sm:inline">3. Agent Learning & Adaptation</span>
              <span className="sm:hidden">Learning</span>
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
              qlooStatus={kit?.qlooStatus}
            />

            <MemoryPortrait name={profile.lovedOneName} stats={profile.domainStats} />

            <div className="p-5 bg-white border border-stone-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div>
                <h4 className="font-serif font-black text-base text-stone-900">
                  Ready to visit {profile.lovedOneName}?
                </h4>
                <p className="text-xs text-stone-600 mt-0.5">
                  A 20-minute kit: familiar favourites, Qloo discoveries, and one labelled experiment.
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
            {kit ? (
              <VisitKitView key={kit.id} kit={kit} profile={profile} onLogReactions={handleLogReactions} disabled={Boolean(busy)} />
            ) : (
              <div className="p-8 bg-white border border-stone-200 rounded-2xl text-center text-sm text-stone-600">
                {busy ? 'Planning the kit…' : 'No kit yet. Choose a sample family or try your own.'}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Before & After Agent Learning Reflection */}
        {activeTab === 'learning' && kit && profile.visitHistory[0] && (
          <div className="space-y-6">
            <BeforeAfterComparison
              previousKit={profile.previousKit || kit}
              nextKit={kit}
              latestLog={profile.visitHistory[0]}
              lovedOneName={profile.lovedOneName}
              stats={profile.domainStats}
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
          setHasLoggedVisit(false);
          setActiveTab('map');
          planFor(newProf);
        }}
      />
    </main>
  );
}
