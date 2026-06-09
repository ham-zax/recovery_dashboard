import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { startOfDay, endOfDay, subDays, addDays } from 'date-fns';
import { computeRecoveryScore, WeekData, ScoreWeights } from '@/lib/score';

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
}

async function computeStatsForPeriod(
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

  const daysCheckedIn = logs.length;
  const totalDays = 7; // Weekly reviews are always exactly 7 days

  const weekData: WeekData = {
    totalWalks,
    totalWorkouts,
    expectedWorkouts: expectedWorkouts || 1,
    avgSleep,
    avgSittingCompliance,
    daysCheckedIn,
    totalDays,
  };

  const recoveryScore = computeRecoveryScore(weekData, weights);

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
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStartingStr = searchParams.get('weekStarting');

    if (!weekStartingStr) {
      return NextResponse.json({ error: 'weekStarting parameter is required' }, { status: 400 });
    }

    const weekStarting = startOfDay(new Date(weekStartingStr));
    const weekEnding = endOfDay(addDays(weekStarting, 6));

    const prevWeekStarting = subDays(weekStarting, 7);
    const prevWeekEnding = endOfDay(subDays(weekStarting, 1));

    // Fetch settings for weights and schedule
    const settings = await prisma.setting.findMany();
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    const defaultWeights: ScoreWeights = { walking: 30, strength: 25, sleep: 20, sitting: 15, checkins: 10 };
    const weights: ScoreWeights = settingsMap.has('recovery_score_weights')
      ? JSON.parse(settingsMap.get('recovery_score_weights')!)
      : defaultWeights;

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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error('Error fetching weekly review:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { weekStarting: weekStartingStr, improved, worsened, nextWeekFocus } = body;

    if (!weekStartingStr) {
      return NextResponse.json({ error: 'weekStarting date is required' }, { status: 400 });
    }

    const weekStarting = startOfDay(new Date(weekStartingStr));
    const weekEnding = endOfDay(addDays(weekStarting, 6));

    // Fetch settings for weights and schedule
    const settings = await prisma.setting.findMany();
    const settingsMap = new Map(settings.map(s => [s.key, s.value]));

    const defaultWeights: ScoreWeights = { walking: 30, strength: 25, sleep: 20, sitting: 15, checkins: 10 };
    const weights: ScoreWeights = settingsMap.has('recovery_score_weights')
      ? JSON.parse(settingsMap.get('recovery_score_weights')!)
      : defaultWeights;

    const defaultSchedule = { mon: 'LOWER', tue: 'UPPER', wed: 'REST', thu: 'LOWER', fri: 'UPPER', sat: 'REST', sun: 'REST' };
    const schedule = settingsMap.has('workout_schedule')
      ? JSON.parse(settingsMap.get('workout_schedule')!)
      : defaultSchedule;

    // Recompute current stats to save snapshot
    const stats = await computeStatsForPeriod(weekStarting, weekEnding, weights, schedule);

    const manualNotes = JSON.stringify({
      improved: improved ?? '',
      worsened: worsened ?? '',
    });

    const review = await prisma.weeklyReview.upsert({
      where: { weekStarting },
      update: {
        compliancePercent: stats.recoveryScore,
        avgPain: stats.avgPain,
        avgReflux: stats.avgReflux,
        totalWalks: stats.totalWalks,
        totalWorkouts: stats.totalWorkouts,
        avgSleep: stats.avgSleep,
        avgSittingBreaks: stats.avgSittingBreaks,
        manualNotes,
        nextWeekFocus: nextWeekFocus ?? '',
      },
      create: {
        weekStarting,
        compliancePercent: stats.recoveryScore,
        avgPain: stats.avgPain,
        avgReflux: stats.avgReflux,
        totalWalks: stats.totalWalks,
        totalWorkouts: stats.totalWorkouts,
        avgSleep: stats.avgSleep,
        avgSittingBreaks: stats.avgSittingBreaks,
        manualNotes,
        nextWeekFocus: nextWeekFocus ?? '',
      },
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error('Error saving weekly review:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
