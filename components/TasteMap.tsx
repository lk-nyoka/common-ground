'use client';

import React, { useState } from 'react';
import { TasteEntity } from '../lib/types';
import { Sparkles, Music, Film, Utensils, MapPin, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';

interface TasteMapProps {
  nodes: TasteEntity[];
  lovedOneName: string;
  eraStart: number;
  eraEnd: number;
}

export function TasteMap({ nodes, lovedOneName, eraStart, eraEnd }: TasteMapProps) {
  const [selectedNode, setSelectedNode] = useState<TasteEntity | null>(nodes[0] || null);

  const getStatusBadge = (status: TasteEntity['status']) => {
    switch (status) {
      case 'worked':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            🟢 Worked (Lit Up)
          </span>
        );
      case 'avoid':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <span className="w-2 h-2 rounded-full bg-rose-600"></span>
            🔴 Avoid List (Distress)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            🟡 Untested (Qloo Discovery)
          </span>
        );
    }
  };

  const getDomainIcon = (domain: TasteEntity['domain']) => {
    switch (domain) {
      case 'music':
        return <Music className="w-4 h-4" />;
      case 'film':
        return <Film className="w-4 h-4" />;
      case 'food':
        return <Utensils className="w-4 h-4" />;
      case 'place':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Sparkles className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-2xl p-6 shadow-sm">
      {/* Header with Era Guardrail */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-stone-200 gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-2xl font-bold text-stone-900">
              {lovedOneName}’s Living Taste Map
            </h3>
            <span className="px-2 py-0.5 rounded text-xs font-mono uppercase tracking-wider bg-stone-200 text-stone-700 font-semibold">
              Qloo Cultural Graph
            </span>
          </div>
          <p className="text-sm text-stone-600 mt-1">
            Visualizes cultural connections found by Qloo. Nodes update status automatically after every visit.
          </p>
        </div>

        {/* Visible Era Guardrail */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-900">
          <span className="w-2 h-2 rounded-full bg-amber-600"></span>
          <span>Era Guardrail: <strong>{eraStart} – {eraEnd}</strong></span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 py-3 text-xs text-stone-600 border-b border-stone-100">
        <span className="font-semibold text-stone-700">Map Legend:</span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Reached them (Green)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Qloo Discovery (Amber)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Excluded / Upset (Red)
        </span>
      </div>

      {/* Graph Visual Canvas */}
      <div className="py-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Node Grid / Constellation */}
        <div className="md:col-span-7 bg-white border border-stone-200 rounded-xl p-5 min-h-[340px] flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-2 right-3 text-[11px] font-mono text-stone-400">
            Interactive Node Canvas
          </div>

          <div className="text-xs text-stone-500 mb-3 italic">
            Click any node below to trace its origin and Qloo discovery lineage:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 z-10">
            {nodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const borderClass =
                node.status === 'worked'
                  ? 'border-emerald-400 bg-emerald-50/60 hover:bg-emerald-100/70'
                  : node.status === 'avoid'
                  ? 'border-rose-400 bg-rose-50/60 hover:bg-rose-100/70 opacity-60'
                  : 'border-amber-300 bg-amber-50/60 hover:bg-amber-100/70';

              const activeRing = isSelected ? 'ring-2 ring-stone-900 ring-offset-2' : '';

              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`text-left p-3 rounded-xl border transition-all duration-200 ${borderClass} ${activeRing} flex flex-col justify-between`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex p-1 rounded-md bg-white/80 text-stone-700 shadow-2xs">
                      {getDomainIcon(node.domain)}
                    </span>
                    <span className="text-[11px] font-mono text-stone-500">
                      {node.year || 'Era match'}
                    </span>
                  </div>

                  <div className="mt-2">
                    <div className="text-xs font-semibold text-stone-900 leading-tight">
                      {node.name.split('—')[0].trim()}
                    </div>
                    {node.sourceSeed && (
                      <div className="text-[11px] text-stone-500 mt-0.5 truncate">
                        via {node.sourceSeed}
                      </div>
                    )}
                  </div>

                  <div className="mt-2 pt-2 border-t border-stone-200/50 flex items-center justify-between">
                    <span className="text-[10px] font-medium text-stone-600">
                      Confidence: {node.confidence}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        node.status === 'worked'
                          ? 'bg-emerald-500'
                          : node.status === 'avoid'
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                    ></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Node Inspector Card */}
        <div className="md:col-span-5 bg-stone-100/80 border border-stone-300 rounded-xl p-5 flex flex-col">
          {selectedNode ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono uppercase text-stone-500 tracking-wider">
                  Node Inspector
                </span>
                {getStatusBadge(selectedNode.status)}
              </div>

              <h4 className="text-lg font-bold text-stone-900 leading-snug">
                {selectedNode.name}
              </h4>

              <div className="mt-3 space-y-2.5 text-xs text-stone-700">
                <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                  <span className="font-semibold text-stone-900 block text-[11px] uppercase tracking-wider mb-0.5">
                    Qloo Discovery Provenance
                  </span>
                  <p className="text-stone-700">
                    {selectedNode.sourceReason || 'Original seed provided by caregiver.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                    <span className="font-semibold text-stone-500 block text-[10px] uppercase">
                      Confidence Tier
                    </span>
                    <span className="font-bold text-stone-900 text-sm">
                      {selectedNode.confidence}
                    </span>
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      {selectedNode.confidenceReason}
                    </p>
                  </div>

                  <div className="p-2.5 bg-white rounded-lg border border-stone-200">
                    <span className="font-semibold text-stone-500 block text-[10px] uppercase">
                      Era & Year
                    </span>
                    <span className="font-bold text-stone-900 text-sm">
                      {selectedNode.year || `${eraStart}–${eraEnd}`}
                    </span>
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      Within youth window
                    </p>
                  </div>
                </div>

                {selectedNode.mediaLink && (
                  <a
                    href={selectedNode.mediaLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-medium transition-colors text-xs"
                  >
                    <span>{selectedNode.mediaLink.label}</span>
                    <span className="text-[10px] opacity-70">↗</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-stone-500 text-xs">
              Select an item on the taste map to see its Qloo discovery path.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
