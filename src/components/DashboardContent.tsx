'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { RecoveryScore } from './RecoveryScore';
import { MetricCard } from './MetricCard';
import { TrendChart } from './charts/TrendChart';
import { ComplianceChart } from './charts/ComplianceChart';
import { SegmentedControl } from './ui/SegmentedControl';
import { ClipboardCheck, Dumbbell } from 'lucide-react';
import { RecoveryState } from '@/lib/score';

interface MetricInfo {
  value: string;
  stateLabel?: string;
  raw: number;
  delta: string | null;
  trend: 'up' | 'down' | 'same' | null;
}

interface DashboardResponse {
  recoveryState: RecoveryState;
  periodDays: number;
  metrics: {
    pain: MetricInfo;
    walking: MetricInfo;
    strength: MetricInfo;
    compliance: MetricInfo;
    reflux: MetricInfo;
    sittingBreaks: MetricInfo;
  };
  insights: {
    trend: string;
    compliance: string;
  };
  events: {
    headline: string;
    date: string;
    severity: 'positive' | 'negative' | 'neutral';
  }[];
  chartData: {
    date: string;
    displayDate: string;
    pain: number | null;
    walked: number | null;
    reflux: number | null;
    compliance: number | null;
  }[];
}

interface DashboardContentProps {
  protocolStrip?: React.ReactNode;
  initialData?: DashboardResponse;
}

export function DashboardContent({ protocolStrip, initialData }: DashboardContentProps) {
  const [days, setDays] = useState<number>(7);
  const [data, setData] = useState<DashboardResponse | null>(initialData ?? null);
  const [loading, setLoading] = useState<boolean>(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  const hasConsumedInitialData = useRef<boolean>(false);

  useEffect(() => {
    // If it's the initial 7d view and we already have the initialData, skip fetch once during hydration
    if (!hasConsumedInitialData.current && days === 7 && initialData) {
      hasConsumedInitialData.current = true;
      setData(initialData);
      setLoading(false);
      return;
    }

    hasConsumedInitialData.current = true;

    let active = true;
    async function fetchDashboard() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/dashboard?days=${days}`);
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data');
        }
        const json = await response.json();
        if (active) {
          setData(json);
        }
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Something went wrong');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchDashboard();
    return () => {
      active = false;
    };
  }, [days, initialData, retryTrigger]);

  if (error) {
    return (
      <div className="p-6 bg-bg-card border border-accent-red/20 rounded-xl max-w-2xl mx-auto text-center mt-12">
        <span className="text-2xl">⚠️</span>
        <h3 className="text-base font-semibold text-accent-red mt-2">Error Loading Dashboard</h3>
        <p className="text-xs text-text-secondary mt-1">{error}</p>
        <button
          onClick={() => setRetryTrigger((prev) => prev + 1)}
          className="mt-4 px-4 py-2 bg-bg-card-hover border border-border text-text-primary text-xs rounded-lg hover:bg-border transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Mobile-only protocol strip */}
      <div className="block md:hidden">
        {protocolStrip}
      </div>

      {loading || !data ? (
        /* Loading Skeleton */
        <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full animate-pulse">
          {/* Recovery Hero Skeleton */}
          <div className="w-full bg-bg-card border border-border rounded-xl h-64 flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-border/40"></div>
            <div className="h-4 w-20 bg-border/40 rounded mt-4"></div>
          </div>
          {/* Metric Cards Skeleton */}
          <div className="w-full grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-bg-card border border-border rounded-xl p-5 h-28 flex flex-col justify-between">
                <div>
                  <div className="h-3 w-16 bg-border/40 rounded"></div>
                  <div className="h-5 w-16 bg-border/40 rounded mt-2"></div>
                </div>
              </div>
            ))}
          </div>
          {/* Chart Skeleton */}
          <div className="w-full bg-bg-card border border-border rounded-xl h-80"></div>
        </div>
      ) : (
        /* Real Content Grid */
        <div className="flex flex-col gap-8 max-w-4xl mx-auto w-full">
          {/* Recovery Hero */}
          <section className="w-full">
            <RecoveryScore state={data.recoveryState} />
          </section>

          {/* Recent Recovery Events */}
          {data.events && data.events.length > 0 && (
            <section className="w-full">
              <h2 className="text-section-header mb-4">Recent Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {data.events.map((event, i) => (
                  <div key={i} className="bg-bg-card border border-border rounded-xl p-4 flex flex-col gap-1 shadow-sm">
                    <span className="text-[10px] text-text-tertiary font-mono uppercase tracking-wider">
                      {event.date}
                    </span>
                    <span className={`text-[13px] font-medium ${
                      event.severity === 'positive' ? 'text-accent-green' :
                      event.severity === 'negative' ? 'text-accent-red' :
                      'text-text-primary'
                    }`}>
                      {event.headline}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Supporting Drivers */}
          <section className="w-full">
            <h2 className="text-section-header mb-4">Supporting Drivers</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard
                label="Compliance"
                value={data.metrics.compliance.value}
                stateLabel={data.metrics.compliance.stateLabel}
                delta={data.metrics.compliance.delta}
                trend={data.metrics.compliance.trend}
                accentColor="accent-green"
              />
              <MetricCard
                label="Walking"
                value={data.metrics.walking.value}
                stateLabel={data.metrics.walking.stateLabel}
                delta={data.metrics.walking.delta}
                trend={data.metrics.walking.trend}
                accentColor="accent-blue"
              />
              <MetricCard
                label="Strength"
                value={data.metrics.strength.value}
                stateLabel={data.metrics.strength.stateLabel}
                delta={data.metrics.strength.delta}
                trend={data.metrics.strength.trend}
                accentColor="accent-green"
              />
              <MetricCard
                label="Reflux"
                value={data.metrics.reflux.value}
                stateLabel={data.metrics.reflux.stateLabel}
                delta={data.metrics.reflux.delta}
                trend={data.metrics.reflux.trend}
                accentColor="accent-amber"
              />
              <MetricCard
                label="Pain"
                value={data.metrics.pain.value}
                stateLabel={data.metrics.pain.stateLabel}
                delta={data.metrics.pain.delta}
                trend={data.metrics.pain.trend}
                accentColor="accent-red"
              />
            </div>
          </section>

          {/* Analytics */}
          <section className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
              <h2 className="text-section-header">Analytics</h2>
              <SegmentedControl
                options={[
                  { label: '7d', value: 7 },
                  { label: '30d', value: 30 },
                  { label: '90d', value: 90 },
                ]}
                value={days}
                onChange={(val) => setDays(Number(val))}
              />
            </div>

            {data.chartData.length === 0 ? (
              <div className="linear-card rounded-xl border border-border p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
                <h3 className="text-sm font-semibold text-text-primary mb-2">No Data Available</h3>
                <p className="text-xs text-text-secondary max-w-xs mb-6">
                  Log your daily check-ins to unlock trend analysis and compliance tracking.
                </p>
                <Link
                  href="/checkin"
                  prefetch={true}
                  className="px-4 py-2 bg-accent-purple text-bg-primary text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Complete Check-In
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="w-full">
                  <TrendChart data={data.chartData} title={data.insights.trend} />
                </div>
                <div className="w-full">
                  <ComplianceChart data={data.chartData} title={data.insights.compliance} />
                </div>
              </div>
            )}
          </section>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-4 md:mt-0 md:justify-end">
            <Link
              id="cta-checkin"
              href="/checkin"
              prefetch={true}
              className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 md:py-2 bg-accent-purple text-bg-primary text-[15px] md:text-sm font-semibold rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-sm"
            >
              <ClipboardCheck size={18} />
              <span>Check-In</span>
            </Link>
            <Link
              id="cta-workout"
              href="/workout"
              prefetch={true}
              className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 md:py-2 bg-bg-card hover:bg-bg-card-hover border border-border text-text-primary text-[15px] md:text-sm font-semibold rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Dumbbell size={18} />
              <span>Log Workout</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
