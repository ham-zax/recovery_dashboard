'use client';

import React, { useState, useEffect } from 'react';
import { format, addDays } from 'date-fns';
import { TrendChart } from './charts/TrendChart';

interface WeeklyReviewContentProps {
  protocolStartDateStr: string;
  totalDurationDays: number;
}

interface WeeklyReviewResponse {
  weekStarting: string;
  currentStats: {
    avgPain: number;
    avgReflux: number;
    totalWalks: number;
    totalWorkouts: number;
    avgSleep: number;
    avgSittingBreaks: number;
    avgSittingCompliance: number;
    recoveryScore: number;
  };
  prevStats: {
    avgPain: number;
    avgReflux: number;
    totalWalks: number;
    totalWorkouts: number;
    avgSleep: number;
    avgSittingBreaks: number;
    avgSittingCompliance: number;
    recoveryScore: number;
  };
  notes: {
    improved: string;
    worsened: string;
    nextWeekFocus: string;
  };
  dailyLogs: {
    date: string;
    pain: number;
    walked: boolean;
    reflux: number;
  }[];
}

export function WeeklyReviewContent({
  protocolStartDateStr,
  totalDurationDays,
}: WeeklyReviewContentProps) {
  const protocolStartDate = new Date(protocolStartDateStr);
  const totalWeeks = Math.ceil(totalDurationDays / 7);

  // Generate all 12 weeks
  const weeks = Array.from({ length: totalWeeks }).map((_, index) => {
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

  // Calculate default week containing today
  const today = new Date();
  let defaultWeekIndex = 0;
  for (let i = 0; i < weeks.length; i++) {
    if (today >= weeks[i].startDate && today <= weeks[i].endDate) {
      defaultWeekIndex = i;
      break;
    }
  }
  // If today is past the protocol duration, default to the last week
  if (today > weeks[weeks.length - 1].endDate) {
    defaultWeekIndex = weeks.length - 1;
  }

  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number>(defaultWeekIndex);
  const selectedWeek = weeks[selectedWeekIndex];

  const [data, setData] = useState<WeeklyReviewResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Notes state
  const [improved, setImproved] = useState<string>('');
  const [worsened, setWorsened] = useState<string>('');
  const [nextWeekFocus, setNextWeekFocus] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Fetch data on week selection change
  useEffect(() => {
    let active = true;
    async function fetchReview() {
      setLoading(true);
      setError(null);
      setSaveStatus('idle');
      try {
        const res = await fetch(`/recovery/api/review?weekStarting=${selectedWeek.startDateStr}`);
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
  }, [selectedWeek]);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const res = await fetch('/recovery/api/review', {
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
    } catch {
      setSaveStatus('error');
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && selectedWeekIndex > 0) {
      setSelectedWeekIndex(selectedWeekIndex - 1);
    } else if (direction === 'next' && selectedWeekIndex < weeks.length - 1) {
      setSelectedWeekIndex(selectedWeekIndex + 1);
    }
  };

  // Delta helpers
  const renderDelta = (current: number, prev: number, isLowerBetter: boolean, isPercent = false) => {
    const diff = current - prev;
    if (prev === 0 && current === 0) return <span className="text-text-tertiary">● 0</span>;
    
    const suffix = isPercent ? '%' : '';
    const diffStr = diff === 0 ? '0' : diff > 0 ? `+${diff.toFixed(1)}${suffix}` : `${diff.toFixed(1)}${suffix}`;
    
    let isGood = diff > 0;
    if (isLowerBetter) {
      isGood = diff < 0;
    }

    if (diff === 0) {
      return <span className="text-text-tertiary">● 0</span>;
    }

    return (
      <span className={isGood ? 'text-accent-green font-semibold' : 'text-accent-red font-semibold'}>
        {diff > 0 ? '▲' : '▼'} {diffStr}
      </span>
    );
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
          onClick={() => setSelectedWeekIndex(selectedWeekIndex)}
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
            ◀
          </button>
          <span className="text-lg font-bold text-text-primary font-mono select-none">
            {selectedWeek.label}
          </span>
          <button
            onClick={() => navigateWeek('next')}
            disabled={selectedWeekIndex === weeks.length - 1}
            className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-40 hover:bg-bg-card-hover rounded-lg transition-colors cursor-pointer"
          >
            ▶
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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Score */}
                <div className="border border-border rounded-lg p-3 bg-bg-input">
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">
                    Recovery Score
                  </span>
                  <div className="text-2xl font-bold font-mono mt-1 text-accent-purple">
                    {data.currentStats.recoveryScore}%
                  </div>
                  <div className="text-[10px] font-mono text-text-tertiary mt-1">
                    {renderDelta(data.currentStats.recoveryScore, data.prevStats.recoveryScore, false, true)}
                  </div>
                </div>

                {/* Pain */}
                <div className="border border-border rounded-lg p-3 bg-bg-input">
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">
                    Avg Pain
                  </span>
                  <div className="text-2xl font-bold font-mono mt-1 text-text-primary">
                    {data.currentStats.avgPain.toFixed(1)}
                  </div>
                  <div className="text-[10px] font-mono text-text-tertiary mt-1">
                    {renderDelta(data.currentStats.avgPain, data.prevStats.avgPain, true)}
                  </div>
                </div>

                {/* Reflux */}
                <div className="border border-border rounded-lg p-3 bg-bg-input">
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">
                    Avg Reflux
                  </span>
                  <div className="text-2xl font-bold font-mono mt-1 text-text-primary">
                    {data.currentStats.avgReflux.toFixed(1)}
                  </div>
                  <div className="text-[10px] font-mono text-text-tertiary mt-1">
                    {renderDelta(data.currentStats.avgReflux, data.prevStats.avgReflux, true)}
                  </div>
                </div>

                {/* Walks */}
                <div className="border border-border rounded-lg p-3 bg-bg-input">
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">
                    Walk Streak
                  </span>
                  <div className="text-2xl font-bold font-mono mt-1 text-text-primary">
                    {data.currentStats.totalWalks}/7
                  </div>
                  <div className="text-[10px] font-mono text-text-tertiary mt-1">
                    {renderDelta(data.currentStats.totalWalks, data.prevStats.totalWalks, false)}
                  </div>
                </div>

                {/* Workouts */}
                <div className="border border-border rounded-lg p-3 bg-bg-input">
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">
                    Workouts
                  </span>
                  <div className="text-xl font-bold font-mono mt-1 text-text-primary">
                    {data.currentStats.totalWorkouts} logged
                  </div>
                  <div className="text-[10px] font-mono text-text-tertiary mt-1">
                    {renderDelta(data.currentStats.totalWorkouts, data.prevStats.totalWorkouts, false)}
                  </div>
                </div>

                {/* Sleep */}
                <div className="border border-border rounded-lg p-3 bg-bg-input">
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">
                    Avg Sleep
                  </span>
                  <div className="text-xl font-bold font-mono mt-1 text-text-primary">
                    {data.currentStats.avgSleep.toFixed(1)}h
                  </div>
                  <div className="text-[10px] font-mono text-text-tertiary mt-1">
                    {renderDelta(data.currentStats.avgSleep, data.prevStats.avgSleep, false)}
                  </div>
                </div>

                {/* Sitting Breaks */}
                <div className="border border-border rounded-lg p-3 bg-bg-input col-span-2">
                  <span className="text-[10px] text-text-secondary uppercase tracking-wider font-semibold">
                    Sitting Breaks Actual
                  </span>
                  <div className="text-xl font-bold font-mono mt-1 text-text-primary">
                    {data.currentStats.avgSittingBreaks.toFixed(1)} breaks/day
                  </div>
                  <div className="text-[10px] font-mono text-text-tertiary mt-1">
                    {renderDelta(data.currentStats.avgSittingBreaks, data.prevStats.avgSittingBreaks, false)}
                  </div>
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
            <div className="space-y-5">
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                Weekly Reflections
              </h3>

              {/* What improved */}
              <div>
                <label className="block text-xs text-text-secondary font-semibold uppercase tracking-wider mb-1.5">
                  What improved?
                </label>
                <textarea
                  value={improved}
                  onChange={(e) => setImproved(e.target.value)}
                  placeholder="e.g. Scapular pain decreased during workouts..."
                  className="w-full bg-bg-input border border-border rounded-lg p-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-focus outline-none resize-none h-24"
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
                  className="w-full bg-bg-input border border-border rounded-lg p-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-focus outline-none resize-none h-24"
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
                  className="w-full bg-bg-input border border-border rounded-lg p-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-border-focus outline-none resize-none h-24"
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
