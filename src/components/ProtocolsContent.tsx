'use client';

import React, { useState, useEffect } from 'react';
import { Target, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

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
}

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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-bold text-text-primary">Protocol Review</h2>
          <p className="text-sm text-text-secondary mt-1">Analyze historical performance and outcomes for each protocol.</p>
        </div>
      </div>

      <div className="space-y-6">
        {protocols.map((p) => (
          <div key={p.id} className={`bg-bg-card border rounded-2xl overflow-hidden shadow-sm transition-all ${p.active ? 'border-accent-purple shadow-[0_0_15px_rgba(167,139,250,0.1)]' : 'border-border'}`}>
            <div className={`px-5 py-4 border-b flex items-center justify-between ${p.active ? 'bg-accent-purple/5 border-accent-purple/20' : 'bg-bg-card-hover/30 border-border'}`}>
              <div className="flex items-center gap-3">
                <Target className={`w-5 h-5 ${p.active ? 'text-accent-purple' : 'text-text-secondary'}`} />
                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider flex items-center gap-2">
                  Protocol {p.version}
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
              </span>
            </div>

            <div className="p-5 md:p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                {/* Days Active */}
                <div className="space-y-1">
                  <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Days Active</div>
                  <div className="text-2xl font-mono text-text-primary font-bold">{p.days}</div>
                </div>

                {/* Score */}
                <div className="space-y-1">
                  <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Avg Score</div>
                  <div className={`text-2xl font-mono font-bold flex items-center gap-2 ${p.recoveryScore >= 75 ? 'text-accent-green' : p.recoveryScore >= 50 ? 'text-accent-yellow' : 'text-accent-red'}`}>
                    {Math.round(p.recoveryScore)}
                    <Activity className="w-4 h-4 opacity-50" />
                  </div>
                </div>

                {/* Pain & Reflux */}
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

                {/* Compliance */}
                <div className="space-y-1">
                  <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Compliance</div>
                  <div className="text-2xl font-mono text-text-primary font-bold flex items-center gap-2">
                    {Math.round(p.compliance * 100)}%
                    {p.compliance >= 0.8 && <CheckCircle2 className="w-4 h-4 text-accent-green" />}
                  </div>
                </div>
              </div>

              {p.days === 0 && (
                <div className="mt-4 text-sm text-text-tertiary">
                  This protocol has no daily logs attached. Start checking in to see outcomes.
                </div>
              )}
            </div>
          </div>
        ))}
        {protocols.length === 0 && (
          <div className="text-center text-text-tertiary py-12 text-sm">
            No protocols have been created or logged yet.
          </div>
        )}
      </div>
    </div>
  );
}
