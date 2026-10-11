'use client';

import React, { useState } from 'react';
import { VisitKit, ReactionType, CaregiverProfile } from '../lib/types';
import { PrintableVisitCard } from './PrintableVisitCard';
import { 
  Sparkles, 
  Smile, 
  MinusCircle, 
  AlertTriangle, 
  ArrowRight, 
  ShieldAlert, 
  MessageSquare, 
  Clock, 
  Heart,
  Printer,
  Music,
  ExternalLink,
  Wand2
} from 'lucide-react';

interface VisitKitViewProps {
  kit: VisitKit;
  profile: CaregiverProfile;
  onLogReactions: (reactions: Record<string, ReactionType>, note?: string) => void;
  isCompleted?: boolean;
}

export function VisitKitView({ kit, profile, onLogReactions, isCompleted }: VisitKitViewProps) {
  const [reactions, setReactions] = useState<Record<string, ReactionType>>({
    [kit.provenFavourites[0]?.id || '']: 'lit_up',
    [kit.qlooDiscoveries[0]?.id || '']: 'lit_up',
    [kit.hypothesis.id]: 'flat'
  });

  const [note, setNote] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [parsedFeedback, setParsedFeedback] = useState<string | null>(null);

  const handleSelectReaction = (itemId: string, type: ReactionType) => {
    setReactions((prev) => ({
      ...prev,
      [itemId]: type
    }));
  };

  // Typed-note natural language reaction parser
  const handleParseNote = () => {
    if (!note.trim()) return;
    const lower = note.toLowerCase();
    const updated = { ...reactions };
    const detected: string[] = [];

    // Analyze text sentiment against kit items
    kit.provenFavourites.forEach((item) => {
      const name = item.name.toLowerCase();
      if (lower.includes('dolly') || lower.includes('smile') || lower.includes('loved') || lower.includes('sung') || lower.includes('happy')) {
        updated[item.id] = 'lit_up';
        detected.push(`${item.name.split('—')[0].trim()}: Lit Up 🟢`);
      }
    });

    if (lower.includes('upset') || lower.includes('cried') || lower.includes('agitated') || lower.includes('scared') || lower.includes('distress') || lower.includes('siren')) {
      updated[kit.hypothesis.id] = 'upset';
      detected.push(`${kit.hypothesis.name.split('—')[0].trim()}: Upset 🔴 (Avoid List Triggered)`);
    } else if (lower.includes('quiet') || lower.includes('flat') || lower.includes('lost interest') || lower.includes('tired')) {
      updated[kit.hypothesis.id] = 'flat';
      detected.push(`${kit.hypothesis.name.split('—')[0].trim()}: Flat 🟡`);
    }

    setReactions(updated);
    setParsedFeedback(detected.length > 0 ? `Agent parsed note: ${detected.join(', ')}` : 'Note noted for visit log.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogReactions(reactions, note);
  };

  return (
    <div className="space-y-6">
      {/* Action Header & Printable Card CTA */}
      <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-amber-700" />
            <h4 className="font-serif text-xl font-bold text-amber-950">
              Why this visit kit for {profile.lovedOneName}?
            </h4>
            <span className="ml-2 text-xs font-mono font-bold text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full">
              Visit #{kit.visitNumber}
            </span>
          </div>
          <ul className="space-y-1 text-xs text-amber-900 leading-relaxed">
            {kit.whyThisKit.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="font-bold text-amber-700 select-none">•</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Print Button */}
        <button
          type="button"
          onClick={() => setIsPrintModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-100 text-stone-900 border border-stone-300 rounded-xl text-xs font-bold transition-all shadow-2xs shrink-0"
        >
          <Printer className="w-4 h-4 text-stone-700" />
          <span>Print Bedside Card</span>
        </button>
      </div>

      {/* The 4 Slot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Slot 1: Proven Favourites (2-3) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase font-bold text-emerald-800 tracking-wider">
                Safe Ground (2–3 Items)
              </span>
              <h5 className="font-serif text-lg font-black text-stone-900">
                Proven Favourites
              </h5>
            </div>
            <span className="text-xs px-2.5 py-1 bg-emerald-100/70 text-emerald-800 font-bold rounded-full border border-emerald-300">
              High Confidence
            </span>
          </div>

          <div className="space-y-3">
            {kit.provenFavourites.map((item) => (
              <div key={item.id} className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-xs text-stone-900">
                    {item.name}
                  </div>
                  {item.year && (
                    <span className="text-[11px] font-mono text-stone-500 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                      {item.year}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-stone-600 mt-1 italic">
                  {item.confidenceReason}
                </div>

                {/* Reaction Buttons */}
                {!isCompleted && (
                  <div className="mt-3 pt-2.5 border-t border-stone-200/70 flex items-center justify-between">
                    <span className="text-[10px] text-stone-500 font-medium">Reaction:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectReaction(item.id, 'lit_up')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          reactions[item.id] === 'lit_up'
                            ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-300'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <Smile className="w-3.5 h-3.5" /> Lit up
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectReaction(item.id, 'flat')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          reactions[item.id] === 'flat'
                            ? 'bg-stone-700 text-white shadow-2xs ring-2 ring-stone-400'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <MinusCircle className="w-3.5 h-3.5" /> Flat
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectReaction(item.id, 'upset')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          reactions[item.id] === 'upset'
                            ? 'bg-rose-600 text-white shadow-2xs ring-2 ring-rose-300'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Upset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Slot 2: Qloo Discoveries (1-2) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase font-bold text-amber-800 tracking-wider">
                Gently Widen (1–2 Items)
              </span>
              <h5 className="font-serif text-lg font-black text-stone-900">
                Qloo Discoveries
              </h5>
            </div>
            <span className="text-xs px-2.5 py-1 bg-amber-100/70 text-amber-900 font-bold rounded-full border border-amber-300">
              Medium Confidence
            </span>
          </div>

          <div className="space-y-3">
            {kit.qlooDiscoveries.map((item) => (
              <div key={item.id} className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-xs text-stone-900">
                    {item.name}
                  </div>
                  {item.year && (
                    <span className="text-[11px] font-mono text-stone-500 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                      {item.year}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-amber-900 mt-1 font-semibold">
                  {item.sourceReason}
                </div>

                {/* Reaction Buttons */}
                {!isCompleted && (
                  <div className="mt-3 pt-2.5 border-t border-stone-200/70 flex items-center justify-between">
                    <span className="text-[10px] text-stone-500 font-medium">Reaction:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectReaction(item.id, 'lit_up')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          reactions[item.id] === 'lit_up'
                            ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-300'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <Smile className="w-3.5 h-3.5" /> Lit up
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectReaction(item.id, 'flat')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          reactions[item.id] === 'flat'
                            ? 'bg-stone-700 text-white shadow-2xs ring-2 ring-stone-400'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <MinusCircle className="w-3.5 h-3.5" /> Flat
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectReaction(item.id, 'upset')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                          reactions[item.id] === 'upset'
                            ? 'bg-rose-600 text-white shadow-2xs ring-2 ring-rose-300'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" /> Upset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Slot 3: One Hypothesis (Labelled in the Open) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase font-bold text-purple-800 tracking-wider">
                Out in the Open (1 Item)
              </span>
              <h5 className="font-serif text-lg font-black text-stone-900">
                This Visit’s Hypothesis
              </h5>
            </div>
            <span className="text-xs px-2.5 py-1 bg-purple-100/70 text-purple-900 font-bold rounded-full border border-purple-300">
              Low Confidence
            </span>
          </div>

          <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200/80">
            <div className="flex items-start justify-between gap-2">
              <div className="font-bold text-xs text-purple-950">
                {kit.hypothesis.name}
              </div>
              {kit.hypothesis.year && (
                <span className="text-[11px] font-mono text-purple-800 bg-white px-1.5 py-0.5 rounded border border-purple-200">
                  {kit.hypothesis.year}
                </span>
              )}
            </div>

            <div className="mt-2.5 text-xs font-bold text-purple-950 bg-white p-2.5 rounded-lg border border-purple-200">
              🏷️ {kit.hypothesis.hypothesisLabel}
            </div>

            <p className="text-[11px] text-purple-900/80 mt-1.5 leading-relaxed">
              {kit.hypothesis.sourceReason}
            </p>

            {/* Reaction Buttons */}
            {!isCompleted && (
              <div className="mt-3 pt-2.5 border-t border-purple-200/80 flex items-center justify-between">
                <span className="text-[10px] text-purple-900 font-medium">Did it connect?</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectReaction(kit.hypothesis.id, 'lit_up')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      reactions[kit.hypothesis.id] === 'lit_up'
                        ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-300'
                        : 'bg-white border border-purple-200 text-purple-900 hover:bg-purple-100'
                    }`}
                  >
                    <Smile className="w-3.5 h-3.5" /> Lit up
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectReaction(kit.hypothesis.id, 'flat')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      reactions[kit.hypothesis.id] === 'flat'
                        ? 'bg-stone-700 text-white shadow-2xs ring-2 ring-stone-400'
                        : 'bg-white border border-purple-200 text-purple-900 hover:bg-purple-100'
                    }`}
                  >
                    <MinusCircle className="w-3.5 h-3.5" /> Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectReaction(kit.hypothesis.id, 'upset')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      reactions[kit.hypothesis.id] === 'upset'
                        ? 'bg-rose-600 text-white shadow-2xs ring-2 ring-rose-300'
                        : 'bg-white border border-purple-200 text-purple-900 hover:bg-purple-100'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Upset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Slot 4: Small Shared Moment (Bedside 20 min) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase font-bold text-blue-800 tracking-wider">
                Present Moment (1 Activity)
              </span>
              <h5 className="font-serif text-lg font-black text-stone-900">
                Shared Moment (20 mins)
              </h5>
            </div>
            <span className="text-xs px-2.5 py-1 bg-blue-100/70 text-blue-900 font-bold rounded-full border border-blue-300">
              Bedside Sized
            </span>
          </div>

          <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2 text-xs">
            <div className="font-bold text-blue-950 text-sm">
              {kit.sharedMoment.title}
            </div>
            <p className="text-stone-700 leading-relaxed">
              {kit.sharedMoment.description}
            </p>
            <div className="p-2.5 bg-white rounded-lg border border-blue-200 text-[11px] text-blue-950 font-medium italic">
              💡 {kit.sharedMoment.actionPrompt}
            </div>
          </div>
        </div>
      </div>

      {/* Conversation Openers & Safety Stop Cues */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* 3 Conversation Openers */}
        <div className="p-5 bg-stone-50 border border-stone-200 rounded-2xl space-y-2.5 shadow-2xs">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-xs uppercase tracking-wider">
            <MessageSquare className="w-4 h-4 text-stone-600" />
            <span>3 Conversation Openers</span>
          </div>
          <ul className="space-y-1.5 text-xs text-stone-700 leading-relaxed">
            {kit.conversationOpeners.map((op, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="font-bold text-stone-400 select-none">{i + 1}.</span>
                <span>{op}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 2 Stop Cues */}
        <div className="p-5 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-2.5 shadow-2xs">
          <div className="flex items-center gap-2 text-rose-950 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 text-rose-700" />
            <span>2 Fixed Stop Cues (Safety Guidance)</span>
          </div>
          <ul className="space-y-1.5 text-xs text-rose-900 leading-relaxed">
            {kit.stopCues.map((cue, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="font-bold text-rose-500 select-none">•</span>
                <span>{cue}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Post-Visit Reaction Log Form */}
      {!isCompleted && (
        <form onSubmit={handleSubmit} className="p-6 bg-stone-950 text-white rounded-3xl space-y-5 shadow-xl border border-stone-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-4">
            <div>
              <h4 className="font-serif text-xl font-bold text-white">
                Log Reactions from this Visit
              </h4>
              <p className="text-xs text-stone-400 mt-0.5">
                Takes under 30 seconds. One tap per item above, or type a note below.
              </p>
            </div>
            <div className="text-xs text-amber-400 font-mono font-medium">
              Upset items go to permanent avoid list
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-stone-300">
                Caregiver Typed Note (Optional — The agent will parse it into reactions):
              </label>
              <button
                type="button"
                onClick={handleParseNote}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300"
              >
                <Wand2 className="w-3 h-3" />
                <span>Auto-Parse Note</span>
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. She smiled at Dolly Parton but went quiet and looked distressed during the war film..."
                className="w-full px-4 py-3 rounded-xl bg-stone-900 border border-stone-700 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
            {parsedFeedback && (
              <div className="p-2 bg-stone-900 rounded-lg border border-amber-500/50 text-[11px] text-amber-300">
                {parsedFeedback}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-stone-400 hidden sm:inline">
              Watch the taste map update its colors and see the Next-Visit Line
            </span>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-xl text-xs font-black transition-all shadow-md ml-auto"
            >
              <span>Save Reactions & Watch Agent Adapt</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* Printable Modal */}
      <PrintableVisitCard
        kit={kit}
        profile={profile}
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
      />
    </div>
  );
}
