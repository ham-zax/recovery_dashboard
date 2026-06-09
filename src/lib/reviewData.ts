import { prisma } from '@/lib/prisma';
import { startOfDay, endOfDay, subDays, addDays } from 'date-fns';
import { calculateDailyRecovery, ScoreWeights, DEFAULT_WEIGHTS, validateWeights } from '@/lib/score';

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
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    const dayKey = dayKeyMap[dayOfWeek];
    const type = schedule[dayKey];
    if (type && type !== 'REST') {
      count++;
    }
    current.setDate(current.getDate() + 1);
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
  schedule: Record<string, string>
): Promise<ComputedStats> {
  const logs = await prisma.dailyLog.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const workouts = await prisma.workoutSession.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalWalks = logs.filter(l => l.walkedToday).length;
  const totalWorkouts = workouts.length;
  const expectedWorkouts = countScheduledWorkouts(startDate, endDate, schedule);

  const avgSleep = logs.length > 0
    ? logs.reduce((acc, l) => acc + l.sleepHours, 0) / logs.length
    : 0;

  const avgSittingBreaks = logs.length > 0
    ? logs.reduce((acc, l) => acc + l.sittingBreaksActual, 0) / logs.length
    : 0;

  const dailySittingCompliances = logs.map(l => {
    const target = l.sittingBreaksTarget > 0 ? l.sittingBreaksTarget : 10;
    return Math.min(1, l.sittingBreaksActual / target);
  });
  const avgSittingCompliance = dailySittingCompliances.length > 0
    ? dailySittingCompliances.reduce((acc, c) => acc + c, 0) / dailySittingCompliances.length
    : 0;

  let totalScore = 0;
  let daysWithScore = 0;

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dTime = startOfDay(d).getTime();
    const log = logs.find(l => startOfDay(new Date(l.date)).getTime() === dTime) || null;
    const dayKey = dayKeyMap[d.getDay()];
    const scheduledType = schedule[dayKey];
    const strengthScheduled = !!(scheduledType && scheduledType !== 'REST');
    const strengthCompleted = workouts.some(w => startOfDay(new Date(w.date)).getTime() === dTime);

    const state = calculateDailyRecovery(log, strengthScheduled, strengthCompleted, weights);
    if (state.score !== null) {
      totalScore += state.score;
      daysWithScore++;
    }
  }

  const recoveryScore = daysWithScore > 0 ? Math.round(totalScore / daysWithScore) : 0;

  const avgPain = logs.length > 0
    ? logs.reduce((acc, l) => acc + l.pain, 0) / logs.length
    : 0;

  const avgReflux = logs.length > 0
    ? logs.reduce((acc, l) => acc + l.reflux, 0) / logs.length
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
  dailyLogs: {
    date: string;
    pain: number;
    walked: boolean;
    reflux: number;
  }[];
}

export async function getWeeklyReviewData(weekStartingStr: string): Promise<WeeklyReviewResponse> {
  const weekStarting = startOfDay(new Date(weekStartingStr));
  const weekEnding = endOfDay(addDays(weekStarting, 6));

  const prevWeekStarting = subDays(weekStarting, 7);
  const prevWeekEnding = endOfDay(subDays(weekStarting, 1));

  // Fetch settings for weights and schedule
  const settings = await prisma.setting.findMany();
  const settingsMap = new Map(settings.map(s => [s.key, s.value]));

  let weights: ScoreWeights = DEFAULT_WEIGHTS;
  if (settingsMap.has('recovery_score_weights')) {
    try {
      const parsed = JSON.parse(settingsMap.get('recovery_score_weights')!);
      weights = validateWeights(parsed);
    } catch {
      // fallback
    }
  }

  const defaultSchedule = { mon: 'LOWER', tue: 'UPPER', wed: 'REST', thu: 'LOWER', fri: 'UPPER', sat: 'REST', sun: 'REST' };
  const schedule = settingsMap.has('workout_schedule')
    ? JSON.parse(settingsMap.get('workout_schedule')!)
    : defaultSchedule;

  // Compute stats for current and previous week
  const currentStats = await computeStatsForPeriod(weekStarting, weekEnding, weights, schedule);
  const prevStats = await computeStatsForPeriod(prevWeekStarting, prevWeekEnding, weights, schedule);

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

  const dailyLogs = await prisma.dailyLog.findMany({
    where: {
      date: {
        gte: weekStarting,
        lte: weekEnding,
      },
    },
    orderBy: { date: 'asc' },
  });

  return {
    weekStarting: weekStarting.toISOString(),
    currentStats,
    prevStats,
    notes: {
      improved,
      worsened,
      nextWeekFocus,
    },
    dailyLogs: dailyLogs.map(l => ({
      date: l.date.toISOString(),
      pain: l.pain,
      walked: l.walkedToday,
      reflux: l.reflux,
    })),
  };
}
