import { prisma } from '@/lib/prisma';
import { calculateDailyRecovery, ScoreWeights, DEFAULT_WEIGHTS, validateWeights } from '@/lib/score';
import { eventProvider, formatDayKey } from './recoveryEvents';
import { getActiveProtocol, parseWorkoutSchedule } from './protocol';
import { startOfDayUtc } from './validation';
import { DailyLog, WorkoutSession, Protocol } from '../generated/prisma';

const dayKeyMap: Record<number, string> = {
  0: 'sun',
  1: 'mon',
  2: 'tue',
  3: 'wed',
  4: 'thu',
  5: 'fri',
  6: 'sat',
};

function countScheduledWorkouts(startDate: Date, endDate: Date, schedule: Record<string, string>): number {
  let count = 0;
  const current = new Date(startDate.getTime());
  while (current <= endDate) {
    const dayOfWeek = current.getUTCDay();
    const dayKey = dayKeyMap[dayOfWeek];
    const type = schedule[dayKey];
    if (type && type !== 'REST') {
      count++;
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return count;
}

interface ComputedStats {
  avgPain: number;
  avgReflux: number;
  totalWalks: number;
  totalWorkouts: number;
  avgSleep: number;
  avgSittingBreaks: number;
  avgSittingCompliance: number;
  recoveryScore: number;
  daysWithScore: number;
  expectedWorkouts: number;
}

export async function computeStatsForPeriod(
  startDate: Date,
  endDate: Date,
  weights: ScoreWeights,
  schedule: Record<string, string>,
  logs: (DailyLog & { protocol: Protocol })[],
  workouts: WorkoutSession[]
): Promise<ComputedStats> {
  const periodLogs = logs.filter(l => l.date >= startDate && l.date <= endDate);
  const periodWorkouts = workouts.filter(w => w.date >= startDate && w.date <= endDate);

  const totalWalks = periodLogs.filter(l => l.walkedToday).length;
  const totalWorkouts = periodWorkouts.length;
  const expectedWorkouts = countScheduledWorkouts(startDate, endDate, schedule);

  const avgSleep = periodLogs.length > 0
    ? periodLogs.reduce((acc, l) => acc + l.sleepHours, 0) / periodLogs.length
    : 0;

  const avgSittingBreaks = periodLogs.length > 0
    ? periodLogs.reduce((acc, l) => acc + l.sittingBreaksActual, 0) / periodLogs.length
    : 0;

  const dailySittingCompliances = periodLogs.map(l => {
    const target = l.protocol.sittingTarget > 0 ? l.protocol.sittingTarget : 10;
    return Math.min(1, l.sittingBreaksActual / target);
  });
  const avgSittingCompliance = dailySittingCompliances.length > 0
    ? dailySittingCompliances.reduce((acc, c) => acc + c, 0) / dailySittingCompliances.length
    : 0;

  let totalScore = 0;
  let daysWithScore = 0;

  const current = new Date(startDate.getTime());
  while (current <= endDate) {
    const dTime = current.getTime();
    const log = periodLogs.find(l => startOfDayUtc(l.date).getTime() === dTime) || null;
    const dayOfWeek = current.getUTCDay();
    const dayKey = dayKeyMap[dayOfWeek];
    const scheduledType = schedule[dayKey];
    const strengthScheduled = !!(scheduledType && scheduledType !== 'REST');
    const strengthCompleted = periodWorkouts.some(w => startOfDayUtc(w.date).getTime() === dTime);

    const state = calculateDailyRecovery(log, strengthScheduled, strengthCompleted, weights);
    if (state.score !== null) {
      totalScore += state.score;
      daysWithScore++;
    }
    
    current.setUTCDate(current.getUTCDate() + 1);
  }

  const recoveryScore = daysWithScore > 0 ? Math.round(totalScore / daysWithScore) : 0;

  const avgPain = periodLogs.length > 0
    ? periodLogs.reduce((acc, l) => acc + l.pain, 0) / periodLogs.length
    : 0;

  const avgReflux = periodLogs.length > 0
    ? periodLogs.reduce((acc, l) => acc + l.reflux, 0) / periodLogs.length
    : 0;

  return {
    avgPain,
    avgReflux,
    totalWalks,
    totalWorkouts,
    avgSleep,
    avgSittingBreaks,
    avgSittingCompliance,
    recoveryScore,
    daysWithScore,
    expectedWorkouts,
  };
}

export interface WeeklyReviewResponse {
  weekStarting: string;
  currentStats: ComputedStats;
  prevStats: ComputedStats;
  notes: {
    improved: string;
    worsened: string;
    nextWeekFocus: string;
  };
  timelineDays: {
    date: string;
    pain: number;
    reflux: number;
    walked: boolean;
    hasWorkout: boolean;
    sleepHours: number;
    sittingBreaksActual: number;
    sittingBreaksTarget: number;
    notes: string | null;
    events: { headline: string; severity: 'positive' | 'negative' | 'neutral' }[];
  }[];
}

export async function getWeeklyReviewData(weekStartingStr: string): Promise<WeeklyReviewResponse> {
  const [y, m, d] = weekStartingStr.split('T')[0].split('-').map(Number);
  const weekStarting = new Date(Date.UTC(y, m - 1, d));
  const weekEnding = new Date(Date.UTC(y, m - 1, d + 6, 23, 59, 59, 999));

  const prevWeekStarting = new Date(Date.UTC(y, m - 1, d - 7));
  const prevWeekEnding = new Date(Date.UTC(y, m - 1, d - 1, 23, 59, 59, 999));

  const protocol = await getActiveProtocol();

  let weights: ScoreWeights = DEFAULT_WEIGHTS;
  if (protocol.recoveryWeights) {
    try {
      const parsed = JSON.parse(protocol.recoveryWeights);
      weights = validateWeights(parsed);
    } catch {
      // fallback
    }
  }

  const schedule = parseWorkoutSchedule(protocol.workoutSchedule);

  // Fetch all logs and workouts for the combined 14-day window ONCE
  const priorLogs = await prisma.dailyLog.findMany({
    where: {
      date: {
        gte: prevWeekStarting,
        lte: weekEnding,
      },
    },
    include: {
      protocol: true,
    },
    orderBy: { date: 'asc' },
  });

  const workouts = await prisma.workoutSession.findMany({
    where: {
      date: {
        gte: prevWeekStarting,
        lte: weekEnding,
      },
    },
  });

  const protocolChanges = await prisma.protocolChange.findMany({
    where: {
      changedAt: {
        gte: prevWeekStarting,
        lte: weekEnding,
      },
    },
  });

  // Compute stats for current and previous week by passing pre-fetched arrays
  const currentStats = await computeStatsForPeriod(weekStarting, weekEnding, weights, schedule, priorLogs, workouts);
  const prevStats = await computeStatsForPeriod(prevWeekStarting, prevWeekEnding, weights, schedule, priorLogs, workouts);

  // Get existing database entry if any
  const existingReview = await prisma.weeklyReview.findUnique({
    where: { weekStarting },
  });

  let improved = '';
  let worsened = '';
  let nextWeekFocus = '';

  if (existingReview) {
    nextWeekFocus = existingReview.nextWeekFocus ?? '';
    if (existingReview.manualNotes) {
      try {
        const parsed = JSON.parse(existingReview.manualNotes);
        improved = parsed.improved ?? '';
        worsened = parsed.worsened ?? '';
      } catch {
        improved = existingReview.manualNotes; // fallback
      }
    }
  }

  // Use the pre-fetched priorLogs filtered for the current week instead of a duplicate query
  const dailyLogs = priorLogs.filter(l => l.date >= weekStarting && l.date <= weekEnding);

  const allEvents = eventProvider.getEvents(priorLogs, workouts, protocolChanges);
  const timelineEvents = eventProvider.selectTimelineEvents(allEvents);

  const eventsByDate = new Map<string, typeof timelineEvents>();
  for (const e of timelineEvents) {
    if (!eventsByDate.has(e.date)) eventsByDate.set(e.date, []);
    eventsByDate.get(e.date)!.push(e);
  }

  const workoutDates = new Set(workouts.map(w => formatDayKey(w.date)));

  const timelineDays = dailyLogs.map(l => {
    const dStr = formatDayKey(l.date);
    const dayWorkouts = workoutDates.has(dStr);
    const dayEvents = (eventsByDate.get(dStr) || []).map(e => ({
      headline: e.headline,
      severity: e.severity
    }));
    
    return {
      date: l.date.toISOString(),
      pain: l.pain,
      reflux: l.reflux,
      walked: l.walkedToday,
      hasWorkout: dayWorkouts,
      sleepHours: l.sleepHours,
      sittingBreaksActual: l.sittingBreaksActual,
      sittingBreaksTarget: l.protocol.sittingTarget,
      notes: l.notes,
      events: dayEvents,
    };
  }).reverse(); // Reverse chronological for timeline

  return {
    weekStarting: weekStarting.toISOString(),
    currentStats,
    prevStats,
    notes: {
      improved,
      worsened,
      nextWeekFocus,
    },
    timelineDays,
  };
}
