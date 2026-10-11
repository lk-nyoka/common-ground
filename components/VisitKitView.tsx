'use client';

import React, { useState } from 'react';
import { VisitKit, ReactionType, ItemReaction } from '../lib/types';
import { 
  Sparkles, 
  Smile, 
  MinusCircle, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  HelpCircle, 
  ShieldAlert, 
  MessageSquare, 
  Clock, 
  HeartHandshake,
  Music,
  ExternalLink
} from 'lucide-react';

interface VisitKitViewProps {
  kit: VisitKit;
  lovedOneName: string;
  onLogReactions: (reactions: Record<string, ReactionType>, note?: string) => void;
  isCompleted?: boolean;
}

export function VisitKitView({ kit, lovedOneName, onLogReactions, isCompleted }: VisitKitViewProps) {
  // Reactions state for each item in the kit
  const allItems = [...kit.provenFavourites, ...kit.qlooDiscoveries, kit.hypothesis];
  
  const [reactions, setReactions] = useState<Record<string, ReactionType>>({
    [kit.provenFavourites[0]?.id || '']: 'lit_up',
    [kit.qlooDiscoveries[0]?.id || '']: 'lit_up',
    [kit.hypothesis.id]: 'flat'
  });

  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectReaction = (itemId: string, type: ReactionType) => {
    setReactions((prev) => ({
      ...prev,
      [itemId]: type
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    onLogReactions(reactions, note);
  };

  return (
    <div className="space-y-6">
      {/* "Why This Kit?" Header Card */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-2.5">
          <Sparkles className="w-4 h-4 text-amber-700" />
          <h4 className="font-serif text-lg font-bold text-amber-950">
            Why this visit kit for {lovedOneName}?
          </h4>
          <span className="ml-auto text-xs font-mono text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded">
            Visit #{kit.visitNumber}
          </span>
        </div>
        <ul className="space-y-1.5 text-xs text-amber-900 leading-relaxed">
          {kit.whyThisKit.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="font-bold text-amber-700 select-none">•</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* The 4 Slot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Slot 1: Proven Favourites (2-3) */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
            <div>
              <span className="text-[11px] font-mono uppercase font-semibold text-emerald-800 tracking-wider">
                Safe Ground
              </span>
              <h5 className="font-serif text-base font-bold text-stone-900">
                Proven Favourites
              </h5>
            </div>
            <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 font-medium rounded border border-emerald-200">
              Confidence: High
            </span>
          </div>

          <div className="space-y-3">
            {kit.provenFavourites.map((item) => (
              <div key={item.id} className="p-3 bg-stone-50 rounded-lg border border-stone-200/70">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-xs text-stone-900">
                    {item.name}
                  </div>
                  {item.year && (
                    <span className="text-[10px] font-mono text-stone-500">
                      {item.year}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-stone-600 mt-1">
                  {item.confidenceReason}
                </div>

                {/* Reaction Buttons */}
                {!isCompleted && (
                  <div className="mt-2.5 pt-2 border-t border-stone-200/60 flex items-center justify-between">
                    <span className="text-[10px] text-stone-500">Visit reaction:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectReaction(item.id, 'lit_up')}
                        className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                          reactions[item.id] === 'lit_up'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <Smile className="w-3 h-3" /> Lit up
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectReaction(item.id, 'flat')}
                        className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                          reactions[item.id] === 'flat'
                            ? 'bg-stone-700 text-white shadow-2xs'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <MinusCircle className="w-3 h-3" /> Flat
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectReaction(item.id, 'upset')}
                        className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                          reactions[item.id] === 'upset'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3" /> Upset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Slot 2: Qloo Discoveries (1-2) */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
            <div>
              <span className="text-[11px] font-mono uppercase font-semibold text-amber-800 tracking-wider">
                Gently Widen
              </span>
              <h5 className="font-serif text-base font-bold text-stone-900">
                Qloo Discovery
              </h5>
            </div>
            <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-800 font-medium rounded border border-amber-200">
              Confidence: Medium
            </span>
          </div>

          <div className="space-y-3">
            {kit.qlooDiscoveries.map((item) => (
              <div key={item.id} className="p-3 bg-stone-50 rounded-lg border border-stone-200/70">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-xs text-stone-900">
                    {item.name}
                  </div>
                  {item.year && (
                    <span className="text-[10px] font-mono text-stone-500">
                      {item.year}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-amber-900 mt-1 font-medium">
                  {item.sourceReason}
                </div>

                {/* Reaction Buttons */}
                {!isCompleted && (
                  <div className="mt-2.5 pt-2 border-t border-stone-200/60 flex items-center justify-between">
                    <span className="text-[10px] text-stone-500">Visit reaction:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectReaction(item.id, 'lit_up')}
                        className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                          reactions[item.id] === 'lit_up'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <Smile className="w-3 h-3" /> Lit up
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectReaction(item.id, 'flat')}
                        className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                          reactions[item.id] === 'flat'
                            ? 'bg-stone-700 text-white shadow-2xs'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <MinusCircle className="w-3 h-3" /> Flat
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectReaction(item.id, 'upset')}
                        className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                          reactions[item.id] === 'upset'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3" /> Upset
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Slot 3: One Hypothesis (Labelled in the open) */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
            <div>
              <span className="text-[11px] font-mono uppercase font-semibold text-purple-800 tracking-wider">
                Careful Experiment
              </span>
              <h5 className="font-serif text-base font-bold text-stone-900">
                This Visit’s Hypothesis
              </h5>
            </div>
            <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-800 font-medium rounded border border-purple-200">
              Confidence: Low
            </span>
          </div>

          <div className="p-3 bg-purple-50/50 rounded-lg border border-purple-200/70">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-xs text-purple-950">
                {kit.hypothesis.name}
              </div>
              {kit.hypothesis.year && (
                <span className="text-[10px] font-mono text-purple-800">
                  {kit.hypothesis.year}
                </span>
              )}
            </div>

            <div className="mt-2 text-xs font-medium text-purple-900 bg-white/80 p-2 rounded border border-purple-200/60">
              🏷️ <strong>{kit.hypothesis.hypothesisLabel}</strong>
            </div>

            <p className="text-[11px] text-purple-800/80 mt-1.5">
              {kit.hypothesis.sourceReason}
            </p>

            {/* Reaction Buttons */}
            {!isCompleted && (
              <div className="mt-3 pt-2 border-t border-purple-200/60 flex items-center justify-between">
                <span className="text-[10px] text-purple-800">Did it connect?</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectReaction(kit.hypothesis.id, 'lit_up')}
                    className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                      reactions[kit.hypothesis.id] === 'lit_up'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-white border border-purple-200 text-purple-900 hover:bg-purple-100'
                    }`}
                  >
                    <Smile className="w-3 h-3" /> Lit up
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectReaction(kit.hypothesis.id, 'flat')}
                    className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                      reactions[kit.hypothesis.id] === 'flat'
                        ? 'bg-stone-700 text-white shadow-2xs'
                        : 'bg-white border border-purple-200 text-purple-900 hover:bg-purple-100'
                    }`}
                  >
                    <MinusCircle className="w-3 h-3" /> Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectReaction(kit.hypothesis.id, 'upset')}
                    className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                      reactions[kit.hypothesis.id] === 'upset'
                        ? 'bg-rose-600 text-white shadow-2xs'
                        : 'bg-white border border-purple-200 text-purple-900 hover:bg-purple-100'
                    }`}
                  >
                    <AlertTriangle className="w-3 h-3" /> Upset
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Slot 4: Small Shared Moment (Bedside 20 min) */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
            <div>
              <span className="text-[11px] font-mono uppercase font-semibold text-blue-800 tracking-wider">
                Present Moment
              </span>
              <h5 className="font-serif text-base font-bold text-stone-900">
                Shared Moment (20 mins)
              </h5>
            </div>
            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-800 font-medium rounded border border-blue-200">
              Bedside Sized
            </span>
          </div>

          <div className="p-3 bg-blue-50/40 rounded-lg border border-blue-200/60 text-xs space-y-2">
            <div className="font-semibold text-blue-950">
              {kit.sharedMoment.title}
            </div>
            <p className="text-stone-700 leading-relaxed">
              {kit.sharedMoment.description}
            </p>
            <div className="p-2 bg-white rounded border border-blue-200 text-[11px] text-blue-900 italic">
              💡 {kit.sharedMoment.actionPrompt}
            </div>
          </div>
        </div>
      </div>

      {/* Conversation Openers & Stop Cues Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 3 Conversation Openers */}
        <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-stone-900 font-semibold text-xs uppercase tracking-wider">
            <MessageSquare className="w-3.5 h-3.5 text-stone-600" />
            3 Conversation Openers
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
        <div className="p-4 bg-rose-50/60 border border-rose-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-rose-900 font-semibold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-700" />
            2 Gentle Stop Cues (Safety Guidance)
          </div>
          <ul className="space-y-1.5 text-xs text-rose-900/90 leading-relaxed">
            {kit.stopCues.map((cue, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="font-bold text-rose-500 select-none">•</span>
                <span>{cue}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Post-Visit Reaction Submission (Takes under 30 seconds) */}
      {!isCompleted && (
        <form onSubmit={handleSubmit} className="p-5 bg-stone-900 text-white rounded-2xl space-y-4 shadow-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-800 pb-3">
            <div>
              <h4 className="font-serif text-lg font-bold">
                Log Reactions from this Visit
              </h4>
              <p className="text-xs text-stone-400">
                One tap per item above, plus an optional short note. Done in under 30 seconds.
              </p>
            </div>
            <div className="text-xs text-stone-400">
              Permanent avoid list safeguards included
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-300 mb-1.5">
              Optional Caregiver Note (or leave blank and use one-taps above):
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. She smiled at Makeba but closed her eyes during the film..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-stone-950 rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <span>Save Reactions & Watch Next Kit Change</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
