'use client';

import React, { useState, useEffect } from 'react';
import { Target, Activity, CheckCircle2, AlertTriangle, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

interface ProtocolStats {
  id: number;
  version: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
  days: number;
  avgPain: number;
  avgReflux: number;
  compliance: number;
  recoveryScore: number;
  impact: { 
    delta: { recoveryScore: number; avgPain: number; avgReflux: number; compliance: number; };
    confidence: 'High' | 'Medium' | 'Low' | null;
    reason: string | null;
  } | null;
}

const ProtocolCard = ({ p, isBest = false }: { p: ProtocolStats, isBest?: boolean }) => (
  <Link href={`/protocols/${p.id}`} className={`block group bg-bg-card border rounded-2xl overflow-hidden shadow-sm transition-all hover:border-text-secondary ${isBest ? 'border-accent-yellow shadow-[0_0_20px_rgba(234,179,8,0.15)]' : p.active ? 'border-accent-purple shadow-[0_0_15px_rgba(167,139,250,0.1)]' : 'border-border'}`}>
    <div className={`px-5 py-4 border-b flex flex-col md:flex-row md:items-center justify-between gap-2 ${isBest ? 'bg-accent-yellow/5 border-accent-yellow/20' : p.active ? 'bg-accent-purple/5 border-accent-purple/20' : 'bg-bg-card-hover/30 border-border'}`}>
      <div className="flex items-center gap-3">
        <Target className={`w-5 h-5 ${isBest ? 'text-accent-yellow' : p.active ? 'text-accent-purple' : 'text-text-secondary'}`} />
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
          Protocol {p.version}
          {isBest && (
            <span className="bg-accent-yellow/20 text-accent-yellow px-2 py-0.5 rounded text-[10px] font-bold">BEST</span>
          )}
          {p.active && (
            <span className="bg-accent-purple/20 text-accent-purple px-2 py-0.5 rounded text-[10px] font-bold">ACTIVE</span>
          )}
        </h3>
      </div>
      <span className="text-xs font-mono text-text-tertiary">
        {p.days > 0 && p.startDate ? (
          <>
            {format(new Date(p.startDate), 'MMM d, yyyy')}
            {p.endDate && p.startDate !== p.endDate && ` - ${format(new Date(p.endDate), 'MMM d, yyyy')}`}
          </>
        ) : (
          'No Logs Yet'
        )}
        <ChevronRight className="w-4 h-4 text-text-tertiary ml-2 inline-block opacity-50 group-hover:opacity-100 transition-opacity" />
      </span>
    </div>

    <div className="p-5 md:p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
        <div className="space-y-1">
          <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Days Active</div>
          <div className="text-2xl font-mono text-text-primary font-bold">{p.days}</div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Avg Score</div>
          <div className={`text-2xl font-mono font-bold flex items-center gap-2 ${p.recoveryScore >= 75 ? 'text-accent-green' : p.recoveryScore >= 50 ? 'text-accent-yellow' : 'text-accent-red'}`}>
            {Math.round(p.recoveryScore)}
            <Activity className="w-4 h-4 opacity-50" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Pain / Reflux</div>
          <div className="text-xl font-mono text-text-primary font-medium flex items-baseline gap-1.5">
            <span className={p.avgPain <= 3 ? 'text-accent-green' : p.avgPain >= 7 ? 'text-accent-red' : 'text-text-primary'}>
              {p.avgPain.toFixed(1)}
            </span>
            <span className="text-text-tertiary text-sm">/</span>
            <span className={p.avgReflux <= 3 ? 'text-accent-green' : p.avgReflux >= 7 ? 'text-accent-red' : 'text-text-primary'}>
              {p.avgReflux.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Compliance</div>
          <div className="text-2xl font-mono text-text-primary font-bold flex items-center gap-2">
            {Math.round(p.compliance * 100)}%
            {p.compliance >= 0.8 && <CheckCircle2 className="w-4 h-4 text-accent-green" />}
          </div>
        </div>
      </div>

      {p.impact?.delta && (
        <div className="mt-8 pt-6 border-t border-border/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
            <h4 className="text-xs text-text-secondary font-semibold uppercase tracking-wider">
              Observed Change After Intervention
            </h4>
            {p.impact.confidence && (
              <div className="flex items-center gap-2 bg-bg-primary px-3 py-1.5 rounded-lg border border-border">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  p.impact.confidence === 'High' ? 'bg-accent-green/10 text-accent-green border border-accent-green/20' :
                  p.impact.confidence === 'Medium' ? 'bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20' :
                  'bg-accent-red/10 text-accent-red border border-accent-red/20'
                }`}>
                  {p.impact.confidence} Confidence
                </span>
                {p.impact.reason && (
                  <span className="text-[10px] text-text-secondary font-mono">
                    {p.impact.reason}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Recovery Score Δ</div>
              <div className={`text-lg font-mono font-bold ${p.impact.delta.recoveryScore > 0 ? 'text-accent-green' : p.impact.delta.recoveryScore < 0 ? 'text-accent-red' : 'text-text-secondary'}`}>
                {p.impact.delta.recoveryScore > 0 ? '+' : ''}{p.impact.delta.recoveryScore.toFixed(1)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Pain Δ</div>
              <div className={`text-lg font-mono font-bold ${p.impact.delta.avgPain < 0 ? 'text-accent-green' : p.impact.delta.avgPain > 0 ? 'text-accent-red' : 'text-text-secondary'}`}>
                {p.impact.delta.avgPain > 0 ? '+' : ''}{p.impact.delta.avgPain.toFixed(2)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Reflux Δ</div>
              <div className={`text-lg font-mono font-bold ${p.impact.delta.avgReflux < 0 ? 'text-accent-green' : p.impact.delta.avgReflux > 0 ? 'text-accent-red' : 'text-text-secondary'}`}>
                {p.impact.delta.avgReflux > 0 ? '+' : ''}{p.impact.delta.avgReflux.toFixed(2)}
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Compliance Δ</div>
              <div className={`text-lg font-mono font-bold ${p.impact.delta.compliance > 0 ? 'text-accent-green' : p.impact.delta.compliance < 0 ? 'text-accent-red' : 'text-text-secondary'}`}>
                {p.impact.delta.compliance > 0 ? '+' : ''}{(p.impact.delta.compliance * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {p.days === 0 && (
        <div className="mt-4 text-sm text-text-tertiary">
          This protocol has no daily logs attached. Start checking in to see outcomes.
        </div>
      )}
    </div>
  </Link>
);

export function ProtocolsContent() {
  const [protocols, setProtocols] = useState<ProtocolStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/protocols');
        if (!res.ok) throw new Error('Failed to load protocols');
        const data = await res.json();
        setProtocols(data.protocols);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading protocols');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-24">
        <div className="h-8 w-48 bg-bg-card animate-pulse rounded-lg border border-border" />
        <div className="space-y-4">
          <div className="h-48 bg-bg-card animate-pulse rounded-2xl border border-border" />
          <div className="h-48 bg-bg-card animate-pulse rounded-2xl border border-border" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-bg-card border border-accent-red/20 rounded-2xl max-w-2xl mx-auto text-center mt-12">
        <AlertTriangle className="w-12 h-12 text-accent-red mx-auto" />
        <h3 className="text-lg font-semibold text-text-primary mt-4">Failed to Load Protocol Review</h3>
        <p className="text-sm text-text-secondary mt-2">{error}</p>
      </div>
    );
  }

  const evaluatedProtocols = protocols.filter(p => p.impact?.delta);
  const unevaluatedProtocols = protocols.filter(p => !p.impact?.delta);

  // Sort by recoveryScore Delta descending
  evaluatedProtocols.sort((a, b) => b.impact!.delta.recoveryScore - a.impact!.delta.recoveryScore);

  const bestProtocol = evaluatedProtocols.length > 0 ? evaluatedProtocols[0] : null;
  const otherEvaluated = evaluatedProtocols.length > 0 ? evaluatedProtocols.slice(1) : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Protocol Review</h2>
          <p className="text-sm text-text-secondary mt-1">Analyze historical performance and outcomes for each protocol.</p>
        </div>
      </div>

      <div className="space-y-10">
        {protocols.length === 0 ? (
          <div className="text-center text-text-tertiary py-12 text-sm">
            No protocols have been created or logged yet.
          </div>
        ) : (
          <>
            {bestProtocol && (
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  Top Intervention
                </h3>
                <ProtocolCard p={bestProtocol} isBest={true} />
              </section>
            )}

            {(otherEvaluated.length > 0 || unevaluatedProtocols.length > 0) && (
              <section className="space-y-4">
                <h3 className="text-lg font-bold text-text-primary">
                  {bestProtocol ? 'Other Protocols' : 'All Protocols'}
                </h3>
                <div className="space-y-6">
                  {otherEvaluated.map((p) => <ProtocolCard key={p.id} p={p} />)}
                  {unevaluatedProtocols.map((p) => <ProtocolCard key={p.id} p={p} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
