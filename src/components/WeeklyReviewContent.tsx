'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, addDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { TrendChart } from './charts/TrendChart';
import { MetricCard } from './MetricCard';
import { WeeklyReviewResponse } from '@/lib/reviewData';

interface WeeklyReviewContentProps {
  protocolStartDateStr: string;
  totalDurationDays: number;
  initialWeekIndex: number;
  initialData: WeeklyReviewResponse;
}

export function WeeklyReviewContent({
  protocolStartDateStr,
  totalDurationDays,
  initialWeekIndex,
  initialData,
}: WeeklyReviewContentProps) {
  const router = useRouter();
  // Generate all 12 weeks (memoized to avoid reconstruction on every reflection input keystroke)
  const weeks = useMemo(() => {
    const protocolStartDate = new Date(protocolStartDateStr);
    const totalWeeks = Math.ceil(totalDurationDays / 7);
    return Array.from({ length: totalWeeks }).map((_, index) => {
      const weekStart = addDays(protocolStartDate, index * 7);
      const weekEnd = addDays(weekStart, 6);
      return {
        index,
        label: `Week ${index + 1}`,
        startDate: weekStart,
        endDate: weekEnd,
        startDateStr: format(weekStart, 'yyyy-MM-dd'),
        rangeStr: `${format(weekStart, 'MMM dd')} – ${format(weekEnd, 'MMM dd, yyyy')}`,
      };
    });
  }, [protocolStartDateStr, totalDurationDays]);

  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(initialWeekIndex);
  const [retryTrigger, setRetryTrigger] = useState<number>(0);

  const hasReconciled = React.useRef(false);

  useEffect(() => {
    if (hasReconciled.current) return;
    hasReconciled.current = true;

    const today = new Date();
    let computedIndex = 0;
    for (let i = 0; i < weeks.length; i++) {
      if (today >= weeks[i].startDate && today <= new Date(weeks[i].endDate.getTime() + 24 * 60 * 60 * 1000 - 1)) {
        computedIndex = i;
        break;
      }
    }
    if (today > new Date(weeks[weeks.length - 1].endDate.getTime() + 24 * 60 * 60 * 1000 - 1)) {
      computedIndex = weeks.length - 1;
    }
    
    if (computedIndex !== initialWeekIndex) {
      setSelectedWeekIndex(computedIndex);
    }
  }, [weeks, initialWeekIndex]);

  const selectedWeek = weeks[selectedWeekIndex];

  const [data, setData] = useState<WeeklyReviewResponse | null>(initialData);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Notes state
  const [improved, setImproved] = useState<string>(initialData.notes.improved);
  const [worsened, setWorsened] = useState<string>(initialData.notes.worsened);
  const [nextWeekFocus, setNextWeekFocus] = useState<string>(initialData.notes.nextWeekFocus);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const lastFetchedWeek = React.useRef<number>(initialWeekIndex);
  const initialRetryTrigger = React.useRef<number>(0);

  // Fetch data on week selection change
  useEffect(() => {
    if (selectedWeekIndex === lastFetchedWeek.current && retryTrigger === initialRetryTrigger.current) return;
    
    lastFetchedWeek.current = selectedWeekIndex;
    initialRetryTrigger.current = retryTrigger;

    let active = true;
    async function fetchReview() {
      setLoading(true);
      setError(null);
      setSaveStatus('idle');
      try {
        const res = await fetch(`/api/review?weekStarting=${selectedWeek.startDateStr}`);
        if (!res.ok) {
          throw new Error('Failed to fetch weekly review data');
        }
        const json = await res.json();
        if (active) {
          setData(json);
          setImproved(json.notes.improved);
          setWorsened(json.notes.worsened);
          setNextWeekFocus(json.notes.nextWeekFocus);
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

    fetchReview();
    return () => {
      active = false;
    };
  }, [selectedWeekIndex, selectedWeek.startDateStr, retryTrigger]);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStarting: selectedWeek.startDateStr,
          improved,
          worsened,
          nextWeekFocus,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save review');
      }

      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
      router.refresh();
    } catch {
      setSaveStatus('error');
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const currentIndex = selectedWeekIndex ?? 0;
    if (direction === 'prev' && currentIndex > 0) {
      setSelectedWeekIndex(currentIndex - 1);
    } else if (direction === 'next' && currentIndex < weeks.length - 1) {
      setSelectedWeekIndex(currentIndex + 1);
    }
  };

  // Delta helpers
  const getTrend = (current: number, prev: number) => {
    if (current > prev) return 'up';
    if (current < prev) return 'down';
    return 'same';
  };

  const getDeltaStr = (current: number, prev: number, isPercent = false) => {
    const diff = Math.abs(current - prev);
    if (diff === 0) return '0';
    return `${diff.toFixed(1)}${isPercent ? '%' : ''}`;
  };

  if (loading && !data) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="h-10 w-64 bg-bg-card border border-border animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-[250px] bg-bg-card border border-border animate-pulse rounded-xl" />
            <div className="h-[300px] bg-bg-card border border-border animate-pulse rounded-xl" />
          </div>
          <div className="space-y-6">
            <div className="h-[450px] bg-bg-card border border-border animate-pulse rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-bg-card border border-accent-red/20 rounded-xl max-w-2xl mx-auto text-center mt-12">
        <span className="text-3xl">⚠️</span>
        <h3 className="text-lg font-semibold text-text-primary mt-4">Failed to Load Review</h3>
        <p className="text-sm text-text-secondary mt-2">{error}</p>
        <button
          onClick={() => setRetryTrigger((prev) => prev + 1)}
          className="mt-6 px-4 py-2 bg-accent-purple text-bg-primary font-bold rounded-lg text-sm cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const chartPoints = data?.dailyLogs.map((log) => ({
    date: log.date,
    displayDate: format(new Date(log.date), 'MMM dd'),
    pain: log.pain,
    walked: log.walked ? 1 : 0,
    reflux: log.reflux,
  })) ?? [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Week Navigator */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-bg-card border border-border p-4 rounded-xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek('prev')}
            disabled={selectedWeekIndex === 0}
            className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-40 hover:bg-bg-card-hover rounded-lg transition-colors cursor-pointer"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-lg font-bold text-text-primary font-mono select-none">
            {selectedWeek.label}
          </span>
          <button
            onClick={() => navigateWeek('next')}
            disabled={selectedWeekIndex === weeks.length - 1}
            className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-40 hover:bg-bg-card-hover rounded-lg transition-colors cursor-pointer"
          >
            <ChevronRight size={20} />
          </button>
          <span className="text-xs text-text-secondary font-mono ml-2">
            ({selectedWeek.rangeStr})
          </span>
        </div>

        <select
          value={selectedWeekIndex}
          onChange={(e) => setSelectedWeekIndex(parseInt(e.target.value))}
          className="bg-bg-input border border-border rounded-lg px-3 py-1.5 text-sm text-text-secondary focus:border-border-focus font-mono outline-none"
        >
          {weeks.map((w) => (
            <option key={w.index} value={w.index}>
              {w.label} ({format(w.startDate, 'MMM dd')} – {format(w.endDate, 'MMM dd')})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Stats and Chart */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Summary Panel */}
          {data && (
            <div className="bg-bg-card border border-border rounded-xl p-6">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
                Weekly Stats Snapshot
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Score */}
                <MetricCard
                  label="Recovery Score"
                  value={`${data.currentStats.recoveryScore}%`}
                  delta={getDeltaStr(data.currentStats.recoveryScore, data.prevStats.recoveryScore, true)}
                  trend={getTrend(data.currentStats.recoveryScore, data.prevStats.recoveryScore)}
                  accentColor="accent-purple"
                />

                {/* Pain */}
                <MetricCard
                  label="Pain"
                  value={data.currentStats.avgPain.toFixed(1)}
                  delta={getDeltaStr(data.currentStats.avgPain, data.prevStats.avgPain)}
                  trend={getTrend(data.currentStats.avgPain, data.prevStats.avgPain)}
                  accentColor="accent-red"
                />

                {/* Reflux */}
                <MetricCard
                  label="Reflux"
                  value={data.currentStats.avgReflux.toFixed(1)}
                  delta={getDeltaStr(data.currentStats.avgReflux, data.prevStats.avgReflux)}
                  trend={getTrend(data.currentStats.avgReflux, data.prevStats.avgReflux)}
                  accentColor="accent-amber"
                />

                {/* Walks */}
                <MetricCard
                  label="Walk Streak"
                  value={`${data.currentStats.totalWalks}/7`}
                  delta={getDeltaStr(data.currentStats.totalWalks, data.prevStats.totalWalks)}
                  trend={getTrend(data.currentStats.totalWalks, data.prevStats.totalWalks)}
                  accentColor="accent-green"
                />

                {/* Workouts */}
                <MetricCard
                  label="Workouts"
                  value={`${data.currentStats.totalWorkouts} logged`}
                  delta={getDeltaStr(data.currentStats.totalWorkouts, data.prevStats.totalWorkouts)}
                  trend={getTrend(data.currentStats.totalWorkouts, data.prevStats.totalWorkouts)}
                  accentColor="accent-blue"
                />

                {/* Sleep */}
                <MetricCard
                  label="Avg Sleep"
                  value={`${data.currentStats.avgSleep.toFixed(1)}h`}
                  delta={getDeltaStr(data.currentStats.avgSleep, data.prevStats.avgSleep)}
                  trend={getTrend(data.currentStats.avgSleep, data.prevStats.avgSleep)}
                  accentColor="accent-blue"
                />

                {/* Sitting Breaks */}
                <div className="col-span-2 lg:col-span-2">
                  <MetricCard
                    label="Sitting Breaks"
                    value={`${data.currentStats.avgSittingBreaks.toFixed(1)}/day`}
                    delta={getDeltaStr(data.currentStats.avgSittingBreaks, data.prevStats.avgSittingBreaks)}
                    trend={getTrend(data.currentStats.avgSittingBreaks, data.prevStats.avgSittingBreaks)}
                    accentColor="accent-purple"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Trend Chart */}
          <div className="bg-bg-card border border-border rounded-xl p-6">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
              7-Day Trend (Pain vs Walking)
            </h3>
            <div className="h-[280px]">
              {chartPoints.length > 0 ? (
                <TrendChart data={chartPoints} />
              ) : (
                <div className="h-full flex items-center justify-center text-text-tertiary text-sm font-mono">
                  No daily logs recorded for this week.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Reflections and Notes */}
        <div className="space-y-6">
          <div className="bg-bg-card border border-border rounded-xl p-6 flex flex-col justify-between min-h-[480px]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-[15px] font-semibold text-text-primary tracking-tight">Reflections</h3>
                  <p className="text-xs text-text-tertiary mt-1 max-w-sm leading-relaxed">
                    Poor results + poor compliance = <strong className="text-accent-red font-semibold">fix compliance first</strong>.<br/>
                    Poor results + good compliance for 8–12 weeks = <strong className="text-accent-amber font-semibold">investigate further</strong>.
                  </p>
                </div>
              </div>

            <div className="space-y-5">
              {/* What improved */}
              <div>
                <label className="block text-xs text-text-secondary font-semibold uppercase tracking-wider mb-1.5">
                  What improved?
                </label>
                <textarea
                  value={improved}
                  onChange={(e) => setImproved(e.target.value)}
                  placeholder="e.g. Scapular pain decreased during workouts..."
                  rows={3}
                  className="w-full bg-bg-input border border-border rounded-xl p-4 text-[17px] leading-relaxed text-text-primary placeholder:text-text-tertiary focus:border-border-focus outline-none resize-none min-h-[100px]"
                />
              </div>

              {/* What worsened */}
              <div>
                <label className="block text-xs text-text-secondary font-semibold uppercase tracking-wider mb-1.5">
                  What worsened?
                </label>
                <textarea
                  value={worsened}
                  onChange={(e) => setWorsened(e.target.value)}
                  placeholder="e.g. Neck stiffness felt higher after long sitting blocks..."
                  rows={3}
                  className="w-full bg-bg-input border border-border rounded-xl p-4 text-[17px] leading-relaxed text-text-primary placeholder:text-text-tertiary focus:border-border-focus outline-none resize-none min-h-[100px]"
                />
              </div>

              {/* Next week's focus */}
              <div>
                <label className="block text-xs text-text-secondary font-semibold uppercase tracking-wider mb-1.5">
                  Next week&apos;s focus
                </label>
                <textarea
                  value={nextWeekFocus}
                  onChange={(e) => setNextWeekFocus(e.target.value)}
                  placeholder="e.g. Stand up every 45 mins. Keep walking streak..."
                  rows={3}
                  className="w-full bg-bg-input border border-border rounded-xl p-4 text-[17px] leading-relaxed text-text-primary placeholder:text-text-tertiary focus:border-border-focus outline-none resize-none min-h-[100px]"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
              <button
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
                className="px-4 py-2 bg-accent-purple hover:bg-opacity-90 disabled:opacity-40 text-bg-primary font-bold rounded-lg text-sm transition-all cursor-pointer shadow-sm font-sans"
              >
                {saveStatus === 'saving' ? 'Saving...' : 'Save Reflections'}
              </button>

              {saveStatus === 'saved' && (
                <span className="text-xs text-accent-green font-mono font-semibold animate-pulse">
                  ✓ Reflections Saved
                </span>
              )}

              {saveStatus === 'error' && (
                <span className="text-xs text-accent-red font-mono font-semibold">
                  ⚠️ Failed to Save
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
