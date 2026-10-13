'use client';

import React from 'react';
import { VisitKit, CaregiverProfile } from '../lib/types';
import { Printer, X, Heart, ShieldAlert, Sparkles } from 'lucide-react';

interface PrintableVisitCardProps {
  kit: VisitKit;
  profile: CaregiverProfile;
  isOpen: boolean;
  onClose: () => void;
}

export function PrintableVisitCard({ kit, profile, isOpen, onClose }: PrintableVisitCardProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative my-6 print:border-none print:shadow-none print:p-0 print:max-w-none print:rounded-none">
        {/* Onscreen action bar (hidden during print) */}
        <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-stone-900 text-lg">
              Bedside Visit Card (1-Page)
            </span>
            <span className="text-[11px] font-mono text-stone-500 bg-stone-100 px-2 py-0.5 rounded">
              Printable Format
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-stone-950 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Page</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Card Content */}
        <div className="space-y-5 text-stone-900 font-sans">
          {/* Header */}
          <div className="border-b-2 border-stone-900 pb-3 flex items-start justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-stone-500 font-bold">
                BACK THEN · 20-MINUTE BEDSIDE VISIT CARD
              </div>
              <h2 className="font-serif text-3xl font-black text-stone-950 mt-0.5">
                Visit with {profile.lovedOneName}
              </h2>
              <div className="text-xs text-stone-600 mt-1">
                Era: <strong>{profile.eraStart} – {profile.eraEnd}</strong> · Visit #{kit.visitNumber} · Generated for bedside companion
              </div>
            </div>
            <div className="text-right text-xs text-stone-500 font-mono hidden sm:block">
              {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          {/* Section 1: Music & Items to Play */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5 border-b border-stone-200 pb-1">
              <span>1. Proven Songs & Sounds to Play (Safe Ground)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {kit.provenFavourites.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg">
                  <div className="font-bold text-stone-900">{item.name}</div>
                  <div className="text-[11px] text-stone-600 mt-0.5 italic">{item.confidenceReason}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 2: Qloo Discovery & Experiment */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-stone-900 flex items-center gap-1.5 border-b border-stone-200 pb-1">
              <span>2. Qloo Discovery & This Visit’s Experiment</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {kit.qlooDiscoveries.map((item, idx) => (
                <div key={idx} className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg">
                  <div className="font-bold text-stone-900">{item.name}</div>
                  <div className="text-[11px] text-amber-900 mt-0.5">{item.sourceReason}</div>
                </div>
              ))}
              {kit.hypothesis && (
                <div className="p-2.5 bg-purple-50/70 border border-purple-200 rounded-lg">
                  <div className="font-bold text-stone-900">
                    Experiment: {kit.hypothesis.name}
                  </div>
                  <div className="text-[11px] text-purple-950 mt-0.5 italic">
                    🏷️ {kit.hypothesis.hypothesisLabel}
                  </div>
                </div>
              )}
              {kit.qlooDiscoveries.length === 0 && !kit.hypothesis && (
                <div className="text-[11px] text-stone-600">Nothing new this visit: just the familiar favourites.</div>
              )}
            </div>
          </div>

          {/* Section 3: The 20-Minute Shared Moment */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl space-y-1.5 text-xs">
            <div className="font-bold text-blue-950 flex items-center gap-1.5 text-xs uppercase tracking-wider">
              <Heart className="w-3.5 h-3.5 text-blue-700" />
              <span>3. Today’s Shared Moment ({kit.sharedMoment.title})</span>
            </div>
            <p className="text-stone-800 leading-relaxed">
              {kit.sharedMoment.description}
            </p>
            <div className="p-2 bg-white rounded border border-blue-200 text-blue-900 italic font-medium">
              Prompt to try: {kit.sharedMoment.actionPrompt}
            </div>
          </div>

          {/* Section 4: 3 Conversation Openers */}
          <div className="space-y-1.5 text-xs">
            <div className="font-bold uppercase tracking-wider text-stone-900 border-b border-stone-200 pb-1">
              4. Three Gentle Conversation Openers
            </div>
            <ul className="space-y-1 text-stone-800 leading-relaxed">
              {kit.conversationOpeners.map((op, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-bold text-stone-500 select-none">{i + 1}.</span>
                  <span>{op}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 5: Safety Stop Cues */}
          <div className="p-3 bg-rose-50/80 border border-rose-300 rounded-xl space-y-1 text-xs">
            <div className="font-bold text-rose-950 flex items-center gap-1.5 uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />
              <span>5. Safety Stop Cues (Pause Guidance)</span>
            </div>
            <ul className="space-y-1 text-rose-900 leading-relaxed text-[11px]">
              {kit.stopCues.map((cue, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-rose-600 font-bold">•</span>
                  <span>{cue}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer */}
          <div className="border-t border-stone-300 pt-2 text-[10px] text-stone-500 flex items-center justify-between">
            <span>Back Then · Built for Dementia Caregiver Connection</span>
            <span>No medical claims · Dignity-first care logic</span>
          </div>
        </div>
      </div>
    </div>
  );
}
