'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RecoveryScore } from './RecoveryScore';
import { MetricCard } from './MetricCard';
import { TrendChart } from './charts/TrendChart';
import { PeriodToggle } from './ui/PeriodToggle';

interface MetricInfo {
  value: string;
  raw: number;
  delta: string | null;
  trend: 'up' | 'down' | 'same' | null;
}

interface DashboardResponse {
  recoveryScore: number;
  periodDays: number;
  metrics: {
    pain: MetricInfo;
    walking: MetricInfo;
    strength: MetricInfo;
    sleep: MetricInfo;
    compliance: MetricInfo;
    reflux: MetricInfo;
    sittingBreaks: MetricInfo;
  };
  chartData: {
    date: string;
    displayDate: string;
    pain: number | null;
    walked: number | null;
    reflux: number | null;
  }[];
}

export function DashboardContent() {
  const [days, setDays] = useState<number>(7);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchDashboard() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/recovery/api/dashboard?days=${days}`);
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
  }, [days]);

  if (error) {
    return (
      <div className="p-6 bg-bg-card border border-accent-red/20 rounded-xl max-w-2xl mx-auto text-center mt-12">
        <span className="text-2xl">⚠️</span>
        <h3 className="text-base font-semibold text-accent-red mt-2">Error Loading Dashboard</h3>
        <p className="text-xs text-text-secondary mt-1">{error}</p>
        <button
          onClick={() => setDays(days)}
          className="mt-4 px-4 py-2 bg-bg-card-hover border border-border text-text-primary text-xs rounded-lg hover:bg-border transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-border pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-text-primary">Dashboard</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Monitor compliance, pain indicators, and trends.
          </p>
        </div>
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <PeriodToggle days={days} onChange={setDays} />
          <Link
            id="cta-checkin"
            href="/recovery/checkin"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-purple text-bg-primary text-xs font-semibold rounded-lg hover:opacity-90 transition-all font-sans cursor-pointer shadow-sm"
          >
            <span>✦</span> Check-In
          </Link>
          <Link
            id="cta-workout"
            href="/recovery/workout"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-bg-card hover:bg-bg-card-hover border border-border text-text-primary text-xs font-medium rounded-lg transition-all font-sans cursor-pointer"
          >
            <span>◆</span> Log Workout
          </Link>
        </div>
      </div>

      {loading || !data ? (
        /* Loading Skeleton */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-pulse">
          {/* Recovery Score Skeleton */}
          <div className="lg:col-span-1 bg-bg-card border border-border rounded-xl h-64 flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-border/40"></div>
            <div className="h-4 w-20 bg-border/40 rounded mt-4"></div>
          </div>
          {/* Metric Cards Skeleton */}
          <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="bg-bg-card border border-border rounded-xl p-5 h-28 flex flex-col justify-between">
                <div>
                  <div className="h-3 w-16 bg-border/40 rounded"></div>
                  <div className="h-5 w-24 bg-border/40 rounded mt-2"></div>
                </div>
                <div className="h-3 w-28 bg-border/40 rounded mt-2"></div>
              </div>
            ))}
          </div>
          {/* Chart Skeleton */}
          <div className="lg:col-span-4 bg-bg-card border border-border rounded-xl h-80"></div>
        </div>
      ) : (
        /* Real Content Grid */
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Circular Progress (Recovery Score) */}
          <div className="lg:col-span-1">
            <RecoveryScore score={data.recoveryScore} />
          </div>

          {/* Metric Cards Grid */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
              <MetricCard
                label="Pain"
                value={data.metrics.pain.value}
                delta={data.metrics.pain.delta}
                trend={data.metrics.pain.trend}
                accentColor="accent-red"
              />
              <MetricCard
                label="Reflux"
                value={data.metrics.reflux.value}
                delta={data.metrics.reflux.delta}
                trend={data.metrics.reflux.trend}
                accentColor="accent-amber"
              />
              <MetricCard
                label="Walking"
                value={data.metrics.walking.value}
                delta={data.metrics.walking.delta}
                trend={data.metrics.walking.trend}
                accentColor="accent-blue"
              />
              <MetricCard
                label="Strength"
                value={data.metrics.strength.value}
                delta={data.metrics.strength.delta}
                trend={data.metrics.strength.trend}
                accentColor="accent-green"
              />
              <MetricCard
                label="Sleep"
                value={data.metrics.sleep.value}
                delta={data.metrics.sleep.delta}
                trend={data.metrics.sleep.trend}
                accentColor="accent-purple"
              />
              <MetricCard
                label="Compliance"
                value={data.metrics.compliance.value}
                delta={data.metrics.compliance.delta}
                trend={data.metrics.compliance.trend}
                accentColor="accent-green"
              />
              <MetricCard
                label="Sitting Breaks"
                value={data.metrics.sittingBreaks.value}
                delta={data.metrics.sittingBreaks.delta}
                trend={data.metrics.sittingBreaks.trend}
                accentColor="accent-blue"
              />
            </div>
          </div>

          {/* Trend Chart */}
          <div className="lg:col-span-4">
            <TrendChart data={data.chartData} />
          </div>
        </div>
      )}
    </div>
  );
}
