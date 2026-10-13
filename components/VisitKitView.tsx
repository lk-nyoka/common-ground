'use client';

import React, { useState } from 'react';
import { VisitKit, ReactionType, CaregiverProfile } from '../lib/types';
import { eraUnchecked } from '../lib/care-logic';
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
  Wand2,
  Bot,
  ChevronDown,
  ChevronUp,
  ShieldCheck
} from 'lucide-react';

interface VisitKitViewProps {
  kit: VisitKit;
  profile: CaregiverProfile;
  onLogReactions: (reactions: Record<string, ReactionType>, note?: string) => void;
  isCompleted?: boolean;
  disabled?: boolean;
}

export function VisitKitView({ kit, profile, onLogReactions, isCompleted, disabled }: VisitKitViewProps) {
  // Nothing is pre-selected: only reactions the caregiver actually taps are saved.
  const [reactions, setReactions] = useState<Record<string, ReactionType>>({});
  const hyp = kit.hypothesis;

  const [note, setNote] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [parsedFeedback, setParsedFeedback] = useState<string | null>(null);
  const [showAgentTrace, setShowAgentTrace] = useState(false);

  const handleSelectReaction = (itemId: string, type: ReactionType) => {
    setReactions((prev) => ({
      ...prev,
      [itemId]: type
    }));
  };

  // Typed-note natural language reaction parser (Dynamic for all profiles)
  const handleParseNote = () => {
    if (!note.trim()) return;
    const lower = note.toLowerCase();
    const updated = { ...reactions };
    const detected: string[] = [];

    const allItems = [...kit.provenFavourites, ...kit.qlooDiscoveries, ...(hyp ? [hyp] : [])];

    allItems.forEach((item) => {
      const baseName = item.name.split('—')[0].trim().toLowerCase();
      const tokens = baseName.split(/[\s,]+/);
      const isMentioned = tokens.some((t) => t.length > 3 && lower.includes(t));

      if (isMentioned || lower.includes('all') || lower.includes('everything')) {
        if (lower.includes('smile') || lower.includes('loved') || lower.includes('sing') || lower.includes('sang') || lower.includes('sung') || lower.includes('happy') || lower.includes('enjoy') || lower.includes('great')) {
          updated[item.id] = 'lit_up';
          detected.push(`${item.name.split('—')[0].trim()}: Lit Up 🟢`);
        } else if (lower.includes('upset') || lower.includes('cried') || lower.includes('agitated') || lower.includes('distress') || lower.includes('scared') || lower.includes('siren') || lower.includes('stop')) {
          updated[item.id] = 'upset';
          detected.push(`${item.name.split('—')[0].trim()}: Upset 🔴 (Avoid List Triggered)`);
        } else if (lower.includes('quiet') || lower.includes('flat') || lower.includes('lost interest') || lower.includes('tired') || lower.includes('bored')) {
          updated[item.id] = 'flat';
          detected.push(`${item.name.split('—')[0].trim()}: Flat 🟡`);
        }
      }
    });

    setReactions(updated);
    setParsedFeedback(
      detected.length > 0
        ? `Keyword match (please check the taps above before saving): ${detected.join(', ')}`
        : 'No item names found in the note. It will be saved with the visit; tap reactions above.'
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(reactions).length === 0) return;
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

      {/* Honest status: where this kit's data came from and who planned it */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="px-2 py-0.5 rounded-md border font-mono font-bold bg-white border-stone-300 text-stone-700">
          {kit.planner === 'llm' ? `Planned by ${kit.plannerModel} with Qloo tools` : 'Planned by rules (no LLM)'}
        </span>
        <span className="px-2 py-0.5 rounded-md border font-mono font-bold bg-white border-stone-300 text-stone-700">
          {kit.qlooStatus === 'live'
            ? 'Qloo: live'
            : kit.qlooStatus === 'saved'
            ? 'Qloo: saved responses'
            : kit.qlooStatus === 'error'
            ? 'Qloo: error'
            : 'Qloo: not connected'}
        </span>
      </div>
      {kit.notices.length > 0 && (
        <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-700 space-y-1">
          {kit.notices.map((n, i) => (
            <div key={i}>• {n}</div>
          ))}
        </div>
      )}

      {/* Agent trace: every step is a call that actually happened */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl border border-stone-800 overflow-hidden shadow-xs">
        <button
          type="button"
          onClick={() => setShowAgentTrace(!showAgentTrace)}
          className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-stone-800/60 transition-colors text-left"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-amber-400">
                Agent trace
              </span>
              <span className="ml-2 text-xs text-stone-300">
                {kit.agentTrace.length} steps · {kit.agentTrace.filter((t) => t.type === 'tool_call').length} Qloo calls
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-stone-400 text-xs font-mono">
            <span>{showAgentTrace ? 'Hide Trace' : 'Inspect Agent Reasoning'}</span>
            {showAgentTrace ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {showAgentTrace && (
          <div className="px-5 pb-5 pt-2 border-t border-stone-800/80 space-y-3 font-mono text-xs">
            <div className="text-[11px] text-stone-400 pb-1 flex items-center justify-between border-b border-stone-800">
              <span>Recorded as the agent ran: real calls, real results</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Name and birth year never sent
              </span>
            </div>

            <div className="space-y-2.5 pt-1">
              {(kit.agentTrace || []).map((step) => {
                const badgeColor =
                  step.type === 'tool_call'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : step.type === 'tool_result'
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : step.type === 'guardrail'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : step.type === 'synthesis'
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-stone-700/50 text-stone-300 border-stone-600';

                return (
                  <div key={step.step} className="p-3 bg-stone-950/70 rounded-xl border border-stone-800/70 flex items-start gap-3">
                    <span className="px-1.5 py-0.5 rounded bg-stone-800 text-[10px] text-stone-400 shrink-0 font-bold">
                      #{step.step}
                    </span>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded border font-semibold ${badgeColor}`}>
                          {step.type}
                        </span>
                        <span className="text-xs font-bold text-stone-200">
                          {step.action}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 font-sans leading-relaxed">
                        {step.details}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* The 4 Slot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Slot 1: Proven Favourites (2-3) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase font-bold text-emerald-800 tracking-wider">
                Safe Ground
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
                  {(item.year || item.activeFrom) && (
                    <span className="text-[11px] font-mono text-stone-500 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                      {item.year || `from ${item.activeFrom}`}
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
                Gently Widen
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
            {kit.qlooDiscoveries.length === 0 && (
              <div className="p-3.5 bg-stone-50 rounded-xl border border-dashed border-stone-300 text-[11px] text-stone-600">
                No Qloo discoveries this time. {kit.qlooStatus === 'not_connected' ? 'Qloo isn’t connected yet.' : 'Qloo had nothing new that passed the era and avoid-list checks.'}
              </div>
            )}
            {kit.qlooDiscoveries.map((item) => (
              <div key={item.id} className="p-3.5 bg-stone-50 rounded-xl border border-stone-200/80">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-xs text-stone-900">
                    {item.name}
                  </div>
                  {(item.year || item.activeFrom) && (
                    <span className="text-[11px] font-mono text-stone-500 bg-white px-1.5 py-0.5 rounded border border-stone-200">
                      {item.year || `from ${item.activeFrom}`}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-amber-900 mt-1 font-semibold">
                  {item.sourceReason}
                </div>
                {eraUnchecked(item) && (
                  <div className="mt-1 inline-block px-1.5 py-0.5 rounded bg-white border border-stone-200 text-[10px] text-stone-600">
                    Era not checked
                  </div>
                )}

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

          {!hyp ? (
            <div className="p-3.5 bg-stone-50 rounded-xl border border-dashed border-stone-300 text-[11px] text-stone-600">
              No experiment this visit: Qloo returned nothing new to test. The kit stays with what is known.
            </div>
          ) : (
          <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200/80">
            <div className="flex items-start justify-between gap-2">
              <div className="font-bold text-xs text-purple-950">
                {hyp.name}
              </div>
              {(hyp.year || hyp.activeFrom) && (
                <span className="text-[11px] font-mono text-purple-800 bg-white px-1.5 py-0.5 rounded border border-purple-200">
                  {hyp.year || `from ${hyp.activeFrom}`}
                </span>
              )}
            </div>

            <div className="mt-2.5 text-xs font-bold text-purple-950 bg-white p-2.5 rounded-lg border border-purple-200">
              🏷️ {hyp.hypothesisLabel}
            </div>

            <p className="text-[11px] text-purple-900/80 mt-1.5 leading-relaxed">
              {hyp.sourceReason}
            </p>
            {eraUnchecked(hyp) && (
              <div className="mt-1 inline-block px-1.5 py-0.5 rounded bg-white border border-purple-200 text-[10px] text-purple-900">
                Era not checked
              </div>
            )}

            {/* Reaction Buttons */}
            {!isCompleted && (
              <div className="mt-3 pt-2.5 border-t border-purple-200/80 flex items-center justify-between">
                <span className="text-[10px] text-purple-900 font-medium">Did it connect?</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectReaction(hyp.id, 'lit_up')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      reactions[hyp.id] === 'lit_up'
                        ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-300'
                        : 'bg-white border border-purple-200 text-purple-900 hover:bg-purple-100'
                    }`}
                  >
                    <Smile className="w-3.5 h-3.5" /> Lit up
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectReaction(hyp.id, 'flat')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      reactions[hyp.id] === 'flat'
                        ? 'bg-stone-700 text-white shadow-2xs ring-2 ring-stone-400'
                        : 'bg-white border border-purple-200 text-purple-900 hover:bg-purple-100'
                    }`}
                  >
                    <MinusCircle className="w-3.5 h-3.5" /> Flat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectReaction(hyp.id, 'upset')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                      reactions[hyp.id] === 'upset'
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
          )}
        </div>

        {/* Slot 4: Small Shared Moment (Bedside 20 min) */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <span className="text-[11px] font-mono uppercase font-bold text-blue-800 tracking-wider">
                Present Moment (1 Activity)
              </span>
              <h5 className="font-serif text-lg font-black text-stone-900">
                One Small Shared Moment
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
                Note (optional, saved with the visit):
              </label>
              <button
                type="button"
                onClick={handleParseNote}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300"
              >
                <Wand2 className="w-3 h-3" />
                <span>Match names in note</span>
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. She smiled at the first song but went quiet during the clip..."
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
              {Object.keys(reactions).length === 0 ? 'Tap at least one reaction above to save.' : `${Object.keys(reactions).length} reaction(s) ready to save.`}
            </span>
            <button
              type="submit"
              disabled={disabled || Object.keys(reactions).length === 0}
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 rounded-xl text-xs font-black transition-all shadow-md ml-auto"
            >
              <span>Save reactions and plan the next visit</span>
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
