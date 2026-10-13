'use client';

import React from 'react';
import { DomainStats, VisitKit, VisitLog } from '../lib/types';
import { MemoryPortrait } from './MemoryPortrait';
import { CheckCircle2, ArrowRight, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';

interface BeforeAfterComparisonProps {
  previousKit: VisitKit;
  nextKit: VisitKit;
  latestLog: VisitLog;
  lovedOneName: string;
  stats: DomainStats;
  onResetDemo?: () => void;
}

export function BeforeAfterComparison({
  previousKit,
  nextKit,
  latestLog,
  lovedOneName,
  stats,
  onResetDemo
}: BeforeAfterComparisonProps) {
  const moments = latestLog.goodMoments ?? 0;
  return (
    <div className="space-y-6 bg-stone-900 text-stone-100 rounded-2xl p-6 shadow-xl border border-stone-800">
      {/* Agent Learning Reflection Header */}
      <div className="border-b border-stone-800 pb-5">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-mono uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4" />
          <span>What the agent learned</span>
        </div>
        <h3 className="font-serif text-2xl font-bold text-white">
          {moments > 0
            ? `You created ${moments} good ${moments === 1 ? 'moment' : 'moments'} with ${lovedOneName} today.`
            : `No big moments this time, and that's useful to know too.`}
        </h3>

        {latestLog.agentReflections.experimentResult && (
          <div className="mt-3 p-3.5 bg-purple-950/50 border border-purple-800/80 rounded-xl text-purple-100 text-xs leading-relaxed">
            <span className="font-bold text-purple-300">🧪 </span>
            {latestLog.agentReflections.experimentResult}
          </div>
        )}

        {/* Pattern-level insight ("I noticed something") */}
        {latestLog.agentReflections.patternLevel && (
          <div className="mt-3 p-3.5 bg-amber-950/60 border border-amber-800/80 rounded-xl text-amber-200 text-xs leading-relaxed">
            <span className="font-bold text-amber-400">💡 </span>
            {latestLog.agentReflections.patternLevel}
          </div>
        )}

        {/* Item-level reflections */}
        <div className="mt-3 space-y-1.5 text-xs text-stone-300">
          {latestLog.agentReflections.itemLevel.map((item, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold select-none">•</span>
              <span>{item}</span>
            </div>
          ))}
        </div>

        {/* The Next-Visit Line */}
        <div className="mt-4 p-3 bg-stone-800 border-l-4 border-amber-400 rounded-r-xl text-xs font-medium text-stone-200">
          <strong>The Next-Visit Line: </strong>
          <span className="italic text-amber-300">
            "{latestLog.agentReflections.nextVisitLine}"
          </span>
        </div>
      </div>

      <MemoryPortrait name={lovedOneName} stats={stats} dark />

      {/* Side-by-Side Before vs. After View */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-serif text-lg font-bold text-white">
            Before & After: How the Kit Changed
          </h4>
          <span className="text-[11px] font-mono text-stone-400">
            Built from the reactions you just logged
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Previous Kit */}
          <div className="p-4 bg-stone-800/80 rounded-xl border border-stone-700/60 space-y-3 opacity-80">
            <div className="flex items-center justify-between text-xs font-mono text-stone-400 border-b border-stone-700 pb-2">
              <span>PREVIOUS VISIT KIT (Visit #{previousKit.visitNumber})</span>
              <span className="text-stone-500">Completed</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-stone-400 block">
                  Proven Favourites:
                </span>
                <span className="text-stone-200">
                  {previousKit.provenFavourites.map((p) => p.name.split('—')[0]).join(', ')}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-stone-400 block">
                  Qloo Discovery Tested:
                </span>
                <span className="text-stone-200">
                  {previousKit.qlooDiscoveries.map((q) => q.name.split('—')[0]).join(', ') || 'None'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-stone-400 block">
                  Hypothesis Tested:
                </span>
                <span className="text-stone-300 italic">
                  {previousKit.hypothesis ? previousKit.hypothesis.name.split('—')[0] : 'None'}
                </span>
              </div>
            </div>
          </div>

          {/* New Next Kit */}
          <div className="p-4 bg-emerald-950/40 rounded-xl border border-emerald-800/80 space-y-3 shadow-md">
            <div className="flex items-center justify-between text-xs font-mono text-emerald-400 border-b border-emerald-900 pb-2">
              <span>NEW ADAPTED KIT (Visit #{nextKit.visitNumber})</span>
              <span className="px-1.5 py-0.5 bg-emerald-800/60 text-emerald-200 rounded text-[10px]">
                Ready for next visit
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-emerald-400 block">
                  Updated Safe Ground:
                </span>
                <span className="text-white font-medium">
                  {nextKit.provenFavourites.map((p) => p.name.split('—')[0]).join(', ')}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-emerald-400 block">
                  Next Qloo Discovery:
                </span>
                <span className="text-stone-100 font-medium">
                  {nextKit.qlooDiscoveries.map((q) => q.name.split('—')[0]).join(', ') || 'None (nothing new from Qloo)'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-semibold text-amber-400 block">
                  New Labelled Hypothesis:
                </span>
                <span className="text-amber-200 italic font-medium">
                  {nextKit.hypothesis?.hypothesisLabel || 'No experiment this time'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Controls */}
      {onResetDemo && (
        <div className="pt-3 border-t border-stone-800 flex items-center justify-between text-xs">
          <span className="text-stone-400">
            Sample family: reset to start again.
          </span>
          <button
            onClick={onResetDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded-lg transition-colors text-xs font-medium"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Demo to Sample State</span>
          </button>
        </div>
      )}
    </div>
  );
}
