'use client';

import React, { useState } from 'react';
import { TasteEntity, Domain } from '../lib/types';
import { 
  Sparkles, 
  Music, 
  Film, 
  Utensils, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle,
  ExternalLink,
  Shield,
  Layers,
  Search
} from 'lucide-react';

interface TasteMapProps {
  nodes: TasteEntity[];
  lovedOneName: string;
  eraStart: number;
  eraEnd: number;
}

export function TasteMap({ nodes, lovedOneName, eraStart, eraEnd }: TasteMapProps) {
  const [selectedNode, setSelectedNode] = useState<TasteEntity | null>(nodes[0] || null);
  const [domainFilter, setDomainFilter] = useState<'all' | Domain>('all');

  const filteredNodes = nodes.filter((n) => domainFilter === 'all' || n.domain === domainFilter);

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
        return <Music className="w-4 h-4 text-purple-600" />;
      case 'film':
        return <Film className="w-4 h-4 text-blue-600" />;
      case 'food':
        return <Utensils className="w-4 h-4 text-amber-600" />;
      case 'place':
        return <MapPin className="w-4 h-4 text-emerald-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-stone-600" />;
    }
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm">
      {/* Header with Era Guardrail */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-serif text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {lovedOneName}’s Living Taste Map
            </h3>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider bg-amber-500/15 text-amber-900 font-bold border border-amber-300/60">
              Qloo Cultural Graph
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            The core landing image. Proven favourites sit in the centre with Qloo’s discoveries fanning out around them. Nodes change colour as you log visits.
          </p>
        </div>

        {/* Visible Era Guardrail */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100/70 border border-amber-300/80 rounded-xl text-xs font-medium text-amber-950 shadow-2xs">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping"></span>
          <span>
            Era Guardrail: <strong>{eraStart} – {eraEnd}</strong> (Ages {Math.max(12, eraStart - (eraStart - 12))} to {Math.max(12, eraStart - (eraStart - 12)) + (eraEnd - eraStart)})
          </span>
        </div>
      </div>

      {/* Domain Filters & Legend Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-stone-200/80 gap-3 text-xs">
        {/* Domain Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-stone-500 font-semibold mr-1">Filter by:</span>
          {(['all', 'music', 'film', 'food', 'place'] as const).map((dom) => (
            <button
              key={dom}
              onClick={() => setDomainFilter(dom)}
              className={`px-3 py-1 rounded-lg font-medium capitalize transition-all ${
                domainFilter === dom
                  ? 'bg-stone-900 text-white shadow-2xs font-bold'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              {dom}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-stone-600">
          <span className="font-semibold text-stone-800">Status:</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Green (Worked)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Amber (Untested)
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Red (Avoid)
          </span>
        </div>
      </div>

      {/* Graph Visual Canvas & Node Inspector */}
      <div className="py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Interactive Node Graph Canvas */}
        <div className="lg:col-span-7 bg-white border border-stone-200 rounded-2xl p-6 min-h-[420px] flex flex-col justify-between relative shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              <span>Cultural Affinity Constellation</span>
            </span>
            <span className="text-[11px] font-mono text-stone-400">
              {filteredNodes.length} nodes active
            </span>
          </div>

          <div className="text-xs text-stone-500 mb-4 italic">
            Click any node to inspect its Qloo connection trail and confidence tier:
          </div>

          {/* Node Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 z-10">
            {filteredNodes.map((node) => {
              const isSelected = selectedNode?.id === node.id;
              const borderClass =
                node.status === 'worked'
                  ? 'border-emerald-300 bg-emerald-50/50 hover:bg-emerald-100/60'
                  : node.status === 'avoid'
                  ? 'border-rose-300 bg-rose-50/50 hover:bg-rose-100/60 opacity-60'
                  : 'border-amber-300 bg-amber-50/50 hover:bg-amber-100/60';

              const activeRing = isSelected ? 'ring-2 ring-stone-950 ring-offset-2' : '';

              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`text-left p-3.5 rounded-xl border transition-all duration-200 ${borderClass} ${activeRing} flex flex-col justify-between group shadow-2xs hover:shadow-xs`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="inline-flex p-1.5 rounded-lg bg-white text-stone-700 shadow-2xs border border-stone-200/60">
                      {getDomainIcon(node.domain)}
                    </span>
                    <span className="text-[11px] font-mono text-stone-500 bg-white/80 px-1.5 py-0.5 rounded border border-stone-200/50">
                      {node.year || 'Era match'}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <div className="text-xs font-bold text-stone-900 leading-snug group-hover:text-stone-950">
                      {node.name.split('—')[0].trim()}
                    </div>
                    {node.sourceSeed && (
                      <div className="text-[11px] text-amber-900 font-medium mt-1 truncate">
                        via {node.sourceSeed}
                      </div>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-stone-600">
                      Confidence: {node.confidence}
                    </span>
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        node.status === 'worked'
                          ? 'bg-emerald-500 ring-2 ring-emerald-200'
                          : node.status === 'avoid'
                          ? 'bg-rose-500'
                          : 'bg-amber-500 ring-2 ring-amber-200'
                      }`}
                    ></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Node Inspector Card */}
        <div className="lg:col-span-5 bg-stone-100 border border-stone-300 rounded-2xl p-6 flex flex-col shadow-xs">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase text-stone-500 tracking-wider font-bold">
                  Node Inspector
                </span>
                {getStatusBadge(selectedNode.status)}
              </div>

              <div>
                <h4 className="text-xl font-serif font-black text-stone-900 leading-tight">
                  {selectedNode.name}
                </h4>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-stone-500">
                  <span className="capitalize font-semibold text-stone-700">{selectedNode.domain}</span>
                  <span>•</span>
                  <span>Release Year: <strong>{selectedNode.year || `${eraStart}–${eraEnd}`}</strong></span>
                </div>
              </div>

              {/* Provenance Card */}
              <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 shadow-2xs space-y-1">
                <span className="font-mono text-[10px] uppercase font-bold text-amber-900 tracking-wider block">
                  Qloo Discovery Provenance
                </span>
                <p className="text-xs text-stone-800 leading-relaxed font-medium">
                  {selectedNode.sourceReason || 'Original seed provided by family.'}
                </p>
              </div>

              {/* Confidence & Safety Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                  <span className="font-mono text-[10px] uppercase font-semibold text-stone-500 block">
                    Confidence Tier
                  </span>
                  <span className="font-black text-stone-900 text-sm block mt-0.5">
                    {selectedNode.confidence}
                  </span>
                  <p className="text-[10px] text-stone-600 mt-0.5 leading-tight">
                    {selectedNode.confidenceReason}
                  </p>
                </div>

                <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs">
                  <span className="font-mono text-[10px] uppercase font-semibold text-stone-500 block">
                    Era Guardrail
                  </span>
                  <span className="font-black text-emerald-800 text-sm block mt-0.5">
                    Verified Match
                  </span>
                  <p className="text-[10px] text-stone-600 mt-0.5 leading-tight">
                    Kept inside {eraStart}–{eraEnd}
                  </p>
                </div>
              </div>

              {/* Streaming & Media Action */}
              {selectedNode.mediaLink && (
                <a
                  href={selectedNode.mediaLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-bold transition-all text-xs shadow-sm"
                >
                  <span>{selectedNode.mediaLink.label}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-stone-500 text-xs">
              Select a node to inspect its Qloo connection path.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
