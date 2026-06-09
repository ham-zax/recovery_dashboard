import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
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

    const [y, m, d] = weekStartingStr.split('T')[0].split('-').map(Number);
    const weekStarting = new Date(Date.UTC(y, m - 1, d));
    const weekEnding = new Date(Date.UTC(y, m - 1, d + 6, 23, 59, 59, 999));

    const { getActiveProtocol } = await import('@/lib/protocol');
    const protocol = await getActiveProtocol();

    let weights: ScoreWeights = DEFAULT_WEIGHTS;
    if (protocol && protocol.recoveryWeights) {
      try {
        const parsed = JSON.parse(protocol.recoveryWeights);
        weights = validateWeights(parsed);
      } catch {
        // fallback
      }
    }

    const defaultSchedule = { mon: 'LOWER', tue: 'UPPER', wed: 'REST', thu: 'LOWER', fri: 'UPPER', sat: 'REST', sun: 'REST' };
    let schedule = defaultSchedule;
    if (protocol && protocol.workoutSchedule) {
      try {
        schedule = JSON.parse(protocol.workoutSchedule);
      } catch {}
    }

    // Recompute current stats to save snapshot
    const logs = await prisma.dailyLog.findMany({
      where: { date: { gte: weekStarting, lte: weekEnding } },
      include: { protocol: true }
    });
    const workouts = await prisma.workoutSession.findMany({
      where: { date: { gte: weekStarting, lte: weekEnding } }
    });
    const stats = await computeStatsForPeriod(weekStarting, weekEnding, weights, schedule, logs, workouts);

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
