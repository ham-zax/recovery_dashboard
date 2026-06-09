import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import { ScoreWeights, DEFAULT_WEIGHTS, validateWeights } from '@/lib/score';
import { getWeeklyReviewData, computeStatsForPeriod } from '@/lib/reviewData';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const weekStartingStr = searchParams.get('weekStarting');

    if (!weekStartingStr) {
      return NextResponse.json({ error: 'weekStarting parameter is required' }, { status: 400 });
    }

    const data = await getWeeklyReviewData(weekStartingStr);
    return NextResponse.json(data);
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
