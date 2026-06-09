'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Target, Activity, CheckCircle2, History, Info, GitMerge } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { formatUtc } from '@/lib/validation';

export function ProtocolDetailContent({ protocolId }: { protocolId: string }) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/protocols/${protocolId}`);
        if (!res.ok) throw new Error('Failed to load protocol');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading protocol');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [protocolId]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-24">
        <div className="h-8 w-48 bg-bg-card animate-pulse rounded-lg border border-border" />
        <div className="h-64 bg-bg-card animate-pulse rounded-2xl border border-border" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 bg-bg-card border border-accent-red/20 rounded-2xl max-w-2xl mx-auto text-center mt-12">
        <h3 className="text-lg font-semibold text-text-primary">Failed to Load Protocol</h3>
        <p className="text-sm text-text-secondary mt-2">{error}</p>
      </div>
    );
  }

  const { protocol: p, stats } = data;
  const changes = p.changes && p.changes.length > 0 ? p.changes[0] : null;

  async function handleClone() {
    if (!confirm('This will create a new protocol version using these settings and activate it immediately. Continue?')) {
      return;
    }
    setCloning(true);
    try {
      const res = await fetch(`/api/protocols/${protocolId}/clone`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error ?? 'Failed to clone protocol');
      }
      router.push('/settings');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error cloning protocol');
      setCloning(false);
    }
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24">
      <Link href="/protocols" className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Protocols
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
            Protocol {p.version}
            {p.active && (
              <span className="bg-accent-purple/20 text-accent-purple px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">Active</span>
            )}
          </h1>
          <p className="text-text-secondary mt-2 font-mono text-sm">
            {formatUtc(p.startedAt, 'MMM d, yyyy')} - {p.endedAt ? formatUtc(p.endedAt, 'MMM d, yyyy') : 'Present'}
          </p>
        </div>
        <div className="flex gap-2">
          {!p.active && (
            <button 
              onClick={handleClone}
              disabled={cloning}
              className="px-4 py-2 bg-bg-card border border-border hover:border-text-secondary text-sm font-semibold rounded-xl text-text-primary transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <History className="w-4 h-4" />
              {cloning ? 'Cloning...' : 'Clone & Activate'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Specs */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2 bg-bg-card-hover/30">
              <Target className="w-4 h-4 text-text-secondary" />
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Configuration
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-xs text-text-tertiary uppercase tracking-wider">Walking Target</div>
                <div className="font-mono text-text-primary">{p.walkingTarget} session{p.walkingTarget > 1 ? 's' : ''}</div>
              </div>
              <div>
                <div className="text-xs text-text-tertiary uppercase tracking-wider">Sitting Target</div>
                <div className="font-mono text-text-primary">{p.sittingTarget} break{p.sittingTarget > 1 ? 's' : ''}</div>
              </div>
              <div>
                <div className="text-xs text-text-tertiary uppercase tracking-wider">Score Weights</div>
                <div className="text-sm text-text-secondary mt-1 space-y-1">
                  <div>Pain: {p.weights.pain}%</div>
                  <div>Reflux: {p.weights.reflux}%</div>
                  <div>Walking: {p.weights.walking}%</div>
                  <div>Compliance: {p.weights.compliance}%</div>
                  <div>Strength: {p.weights.strength}%</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2 bg-bg-card-hover/30">
              <Activity className="w-4 h-4 text-text-secondary" />
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Schedule
              </h3>
            </div>
            <div className="p-5">
              <div className="space-y-2">
                {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => (
                  <div key={day} className="flex justify-between text-sm">
                    <span className="text-text-secondary uppercase">{day}</span>
                    <span className={`font-mono ${p.schedule[day] === 'REST' ? 'text-text-tertiary' : 'text-text-primary font-bold'}`}>
                      {p.schedule[day]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Context & Impact */}
        <div className="md:col-span-2 space-y-6">
          {changes && (
            <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-border flex items-center gap-2 bg-bg-card-hover/30">
                <GitMerge className="w-4 h-4 text-text-secondary" />
                <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                  Genesis & Rationale
                </h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="w-1.5 h-1.5 rounded-full bg-text-tertiary mt-2 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-text-primary">Changed from {changes.fromProtocol?.version || 'previous'}</div>
                    <div className="text-sm text-text-secondary mt-1 font-mono break-words">
                      {changes.changes}
                    </div>
                  </div>
                </div>
                {changes.reason && (
                  <div className="flex gap-4 items-start border-t border-border/50 pt-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-yellow mt-2 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-text-primary">Reason</div>
                      <div className="text-sm text-text-secondary mt-1">
                        {changes.reason}
                      </div>
                    </div>
                  </div>
                )}
                {changes.notes && (
                  <div className="flex gap-4 items-start border-t border-border/50 pt-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-blue mt-2 shrink-0" />
                    <div>
                      <div className="text-sm font-semibold text-text-primary">Detailed Notes</div>
                      <div className="text-sm text-text-secondary mt-1 whitespace-pre-wrap">
                        {changes.notes}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border flex items-center gap-2 bg-bg-card-hover/30">
              <Info className="w-4 h-4 text-text-secondary" />
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                Aggregate Outcomes
              </h3>
            </div>
            <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-1">
                <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Days Active</div>
                <div className="text-2xl font-mono text-text-primary font-bold">{stats.days}</div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Avg Score</div>
                <div className={`text-2xl font-mono font-bold flex items-center gap-2 ${stats.recoveryScore >= 75 ? 'text-accent-green' : stats.recoveryScore >= 50 ? 'text-accent-yellow' : 'text-accent-red'}`}>
                  {Math.round(stats.recoveryScore)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Pain / Reflux</div>
                <div className="text-xl font-mono text-text-primary font-medium flex items-baseline gap-1.5">
                  <span className={stats.avgPain <= 3 ? 'text-accent-green' : stats.avgPain >= 7 ? 'text-accent-red' : 'text-text-primary'}>
                    {stats.avgPain.toFixed(1)}
                  </span>
                  <span className="text-text-tertiary text-sm">/</span>
                  <span className={stats.avgReflux <= 3 ? 'text-accent-green' : stats.avgReflux >= 7 ? 'text-accent-red' : 'text-text-primary'}>
                    {stats.avgReflux.toFixed(1)}
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Compliance</div>
                <div className="text-2xl font-mono text-text-primary font-bold flex items-center gap-2">
                  {Math.round(stats.compliance * 100)}%
                  {stats.compliance >= 0.8 && <CheckCircle2 className="w-4 h-4 text-accent-green" />}
                </div>
              </div>
            </div>

            {stats.observedOutcome && stats.observedOutcome.observedOutcome !== 'Insufficient Data' && stats.observedOutcome.recoveryDelta !== null && (
              <div className="bg-bg-secondary border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-text-primary">Observed Outcome</h3>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20">Experimental</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className={`px-2.5 py-1 rounded-full font-medium ${
                      stats.observedOutcome.confidence === 'High' ? 'bg-accent-green/10 text-accent-green border border-accent-green/20' :
                      stats.observedOutcome.confidence === 'Medium' ? 'bg-accent-yellow/10 text-accent-yellow border border-accent-yellow/20' :
                      'bg-bg-tertiary text-text-secondary border border-border'
                    }`}>
                      {stats.observedOutcome.confidence} Confidence
                    </span>
                    <span className={`px-2.5 py-1 rounded-full font-medium ${
                      stats.observedOutcome.observedOutcome === 'Improving' ? 'bg-accent-green/10 text-accent-green border border-accent-green/20' :
                      stats.observedOutcome.observedOutcome === 'Worsening' ? 'bg-accent-red/10 text-accent-red border border-accent-red/20' :
                      'bg-bg-tertiary text-text-secondary border border-border'
                    }`}>
                      {stats.observedOutcome.observedOutcome}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Recovery Score Δ</div>
                    <div className={`text-lg font-mono font-bold ${stats.observedOutcome.recoveryDelta > 0 ? 'text-accent-green' : stats.observedOutcome.recoveryDelta < 0 ? 'text-accent-red' : 'text-text-secondary'}`}>
                      {stats.observedOutcome.recoveryDelta > 0 ? '+' : ''}{stats.observedOutcome.recoveryDelta.toFixed(1)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Pain Δ</div>
                    <div className={`text-lg font-mono font-bold ${stats.observedOutcome.painDelta! < 0 ? 'text-accent-green' : stats.observedOutcome.painDelta! > 0 ? 'text-accent-red' : 'text-text-secondary'}`}>
                      {stats.observedOutcome.painDelta! > 0 ? '+' : ''}{stats.observedOutcome.painDelta!.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Reflux Δ</div>
                    <div className={`text-lg font-mono font-bold ${stats.observedOutcome.refluxDelta! < 0 ? 'text-accent-green' : stats.observedOutcome.refluxDelta! > 0 ? 'text-accent-red' : 'text-text-secondary'}`}>
                      {stats.observedOutcome.refluxDelta! > 0 ? '+' : ''}{stats.observedOutcome.refluxDelta!.toFixed(2)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-text-tertiary uppercase tracking-wider">Compliance Δ</div>
                    <div className={`text-lg font-mono font-bold ${stats.observedOutcome.complianceDelta! > 0 ? 'text-accent-green' : stats.observedOutcome.complianceDelta! < 0 ? 'text-accent-red' : 'text-text-secondary'}`}>
                      {stats.observedOutcome.complianceDelta! > 0 ? '+' : ''}{(stats.observedOutcome.complianceDelta! * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {stats.days > 0 && stats.days < 14 && (
              <div className="px-5 py-4 border-t border-border bg-bg-primary/30 text-sm text-text-tertiary">
                Need at least 14 days of data to compute observed outcomes (Currently {stats.days}/14).
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
