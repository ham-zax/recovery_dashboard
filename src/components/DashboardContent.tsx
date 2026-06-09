'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { RecoveryScore } from './RecoveryScore';
import { MetricCard } from './MetricCard';
import { TrendChart } from './charts/TrendChart';
import { SegmentedControl } from './ui/SegmentedControl';
import { ClipboardCheck, Dumbbell } from 'lucide-react';

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

interface DashboardContentProps {
  protocolStrip?: React.ReactNode;
}

export function DashboardContent({ protocolStrip }: DashboardContentProps) {
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
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Mobile-only protocol strip */}
      <div className="block md:hidden">
        {protocolStrip}
      </div>

      {loading || !data ? (
        /* Loading Skeleton */
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
          {/* Recovery Score Skeleton */}
          <div className="md:col-span-1 bg-bg-card border border-border rounded-xl h-64 flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-border/40"></div>
            <div className="h-4 w-20 bg-border/40 rounded mt-4"></div>
          </div>
          {/* Metric Cards Skeleton */}
          <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
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
          <div className="md:col-span-4 bg-bg-card border border-border rounded-xl h-80"></div>
        </div>
      ) : (
        /* Real Content Grid */
        <div className="flex flex-col gap-6">
          {/* Recovery Score & Segmented Control row for mobile, top layout for desktop */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <RecoveryScore score={data.recoveryScore} />
            </div>

            <div className="md:col-span-3 flex flex-col gap-4">
              <div className="flex justify-center md:justify-end">
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

              {/* Metric Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                  label="Compliance"
                  value={data.metrics.compliance.value}
                  delta={data.metrics.compliance.delta}
                  trend={data.metrics.compliance.trend}
                  accentColor="accent-green"
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
                  label="Sitting Breaks"
                  value={data.metrics.sittingBreaks.value}
                  delta={data.metrics.sittingBreaks.delta}
                  trend={data.metrics.sittingBreaks.trend}
                  accentColor="accent-blue"
                />
                <MetricCard
                  label="Pain"
                  value={data.metrics.pain.value}
                  delta={data.metrics.pain.delta}
                  trend={data.metrics.pain.trend}
                  accentColor="accent-red"
                />
              </div>
            </div>
          </div>

          {/* Trend Chart */}
          <div className="w-full">
            <TrendChart data={data.chartData} />
          </div>

          {/* Action Buttons (bottom on mobile, desktop can be wherever) */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2 md:mt-0 md:justify-end">
            <Link
              id="cta-checkin"
              href="/checkin"
              className="flex w-full sm:w-auto items-center justify-center gap-2 px-6 py-3 md:py-2 bg-accent-purple text-bg-primary text-[15px] md:text-sm font-semibold rounded-xl hover:opacity-90 transition-all cursor-pointer shadow-sm"
            >
              <ClipboardCheck size={18} />
              <span>Check-In</span>
            </Link>
            <Link
              id="cta-workout"
              href="/workout"
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
