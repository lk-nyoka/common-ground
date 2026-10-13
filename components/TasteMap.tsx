'use client';

import React, { useState } from 'react';
import { TasteEntity, Domain, QlooStatus } from '../lib/types';
import { eraUnchecked } from '../lib/care-logic';
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
  Info
} from 'lucide-react';

interface TasteMapProps {
  nodes: TasteEntity[];
  lovedOneName: string;
  eraStart: number;
  eraEnd: number;
  qlooStatus?: QlooStatus;
}

export function TasteMap({ nodes, lovedOneName, eraStart, eraEnd, qlooStatus }: TasteMapProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = nodes.find((n) => n.id === selectedId) || nodes[0] || null;
  const setSelectedNode = (n: TasteEntity) => setSelectedId(n.id);
  const qlooCount = nodes.filter((n) => n.provenance !== 'family').length;
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
            🟡 Untested
          </span>
        );
    }
  };

  const getProvenanceBadge = (node: TasteEntity) => {
    switch (node.provenance) {
      case 'qloo_live':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            Qloo (live)
          </span>
        );
      case 'qloo_saved':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-100 text-sky-900 border border-sky-300">
            Qloo (saved{node.capturedAt ? ` ${node.capturedAt.slice(0, 10)}` : ''})
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-stone-100 text-stone-700 border border-stone-200">
            Family memory
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
      case 'tv':
        return <Film className="w-4 h-4 text-sky-600" />;
      default:
        return <Sparkles className="w-4 h-4 text-stone-600" />;
    }
  };

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm">
      {/* Honest Connection Status Banner */}
      {qlooStatus && qlooStatus !== 'live' && (
        <div className="mb-5 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            {qlooStatus === 'saved' && (
              <>
                <strong>Qloo key not set:</strong> discoveries below are real Qloo responses saved from earlier live calls.
              </>
            )}
            {qlooStatus === 'not_connected' && (
              <>
                <strong>Qloo isn&apos;t connected yet:</strong> only the family&apos;s own memories are shown. Discoveries appear once a Qloo API key is added. Nothing is invented in the meantime.
              </>
            )}
            {qlooStatus === 'error' && (
              <>
                <strong>Qloo didn&apos;t answer:</strong> showing what is already known. See the agent trace in the visit kit for the error.
              </>
            )}
          </span>
        </div>
      )}

      {/* Header with Era Guardrail */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 border-b border-stone-200 gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="font-serif text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
              {lovedOneName}’s Living Taste Map
            </h3>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono uppercase tracking-wider bg-stone-200 text-stone-800 font-bold border border-stone-300">
              Cultural Affinity Graph
            </span>
          </div>
          <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
            Family favourites plus {qlooCount} {qlooCount === 1 ? 'discovery' : 'discoveries'} from Qloo, each linked to the favourite it came from. Discoveries reflect what people with similar tastes like, not predictions about one person.
          </p>
        </div>

        {/* Visible Era Guardrail */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100/70 border border-amber-300/80 rounded-xl text-xs font-medium text-amber-950 shadow-2xs">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-ping"></span>
          <span>
            Era Guardrail: <strong>{eraStart} – {eraEnd}</strong>
          </span>
        </div>
      </div>

      {/* Domain Filters & Legend Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b border-stone-200/80 gap-3 text-xs">
        {/* Domain Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-stone-500 font-semibold mr-1">Filter by:</span>
          {(['all', 'music', 'film', 'tv', 'food', 'place'] as const).map((dom) => (
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
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Worked
          </span>
          <span className="inline-flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Untested
          </span>
          <span className="inline-flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Avoid
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
              <span>Taste map</span>
            </span>
            <span className="text-[11px] font-mono text-stone-400">
              {filteredNodes.length} nodes active
            </span>
          </div>

          <div className="text-xs text-stone-500 mb-4 italic">
            Click any node below to inspect its source provenance and group affinity match:
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
                    <div className="flex items-center gap-1">
                      {getProvenanceBadge(node)}
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <div className="text-xs font-bold text-stone-900 leading-snug group-hover:text-stone-950">
                      {node.name.split('—')[0].trim()}
                    </div>
                    {node.sourceSeed && node.provenance !== 'family' && (
                      <div className="text-[11px] text-amber-900 font-medium mt-1 truncate">
                        via {node.sourceSeed}
                      </div>
                    )}
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-stone-200/60 flex items-center justify-between text-[10px]">
                    <span className="font-semibold text-stone-600">
                      Confidence: {node.confidence}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      {eraUnchecked(node) && (
                        <span className="px-1.5 py-0.5 rounded bg-stone-100 border border-stone-200 text-stone-600 font-medium">Era not checked</span>
                      )}
                      {/* Icon plus colour, so status doesn't rely on colour alone */}
                      {node.status === 'worked' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-label="Worked" />
                      ) : node.status === 'avoid' ? (
                        <AlertCircle className="w-4 h-4 text-rose-600" aria-label="Avoid" />
                      ) : (
                        <HelpCircle className="w-4 h-4 text-amber-600" aria-label="Untested" />
                      )}
                    </span>
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
                <div className="flex items-center gap-2 mt-1.5 text-xs text-stone-600">
                  <span className="capitalize font-semibold text-stone-700">{selectedNode.domain}</span>
                  {selectedNode.year && (
                    <>
                      <span>•</span>
                      <span>Year: <strong>{selectedNode.year}</strong></span>
                    </>
                  )}
                  {!selectedNode.year && selectedNode.activeFrom && (
                    <>
                      <span>•</span>
                      <span>Active from <strong>{selectedNode.activeFrom}</strong></span>
                    </>
                  )}
                  {selectedNode.qlooEntityType && (
                    <>
                      <span>•</span>
                      <code className="text-[10px] bg-stone-200 px-1 py-0.5 rounded font-mono text-stone-700">
                        {selectedNode.qlooEntityType}
                      </code>
                    </>
                  )}
                </div>
              </div>

              {/* Provenance Card */}
              <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 shadow-2xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase font-bold text-amber-900 tracking-wider">
                    Data Source & Affinity
                  </span>
                  {getProvenanceBadge(selectedNode)}
                </div>
                <p className="text-xs text-stone-800 leading-relaxed font-medium mt-1">
                  {selectedNode.sourceReason || 'Family memory.'}
                </p>
              </div>

              {/* Confidence & Guardrail Grid */}
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
                    {eraStart}–{eraEnd}
                  </span>
                  <p className="text-[10px] text-stone-600 mt-0.5 leading-tight">
                    {selectedNode.year
                      ? selectedNode.year <= eraEnd
                        ? `${selectedNode.year}: within the era`
                        : `${selectedNode.year}: after the era`
                      : selectedNode.activeFrom
                      ? `Active from ${selectedNode.activeFrom}: started within the era`
                      : selectedNode.provenance === 'family'
                      ? 'Family memory'
                      : 'Era not checked: Qloo gives no year for this'}
                  </p>
                </div>
              </div>

              {/* Media Action */}
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
              Select a node to inspect its cultural affinity trail.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
