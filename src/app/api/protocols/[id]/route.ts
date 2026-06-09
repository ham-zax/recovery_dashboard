import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { calculateProtocolOutcome } from '@/lib/protocolOutcome';
import { calculateDailyRecovery, parseRecoveryWeights } from '@/lib/score';
import { parseWorkoutSchedule } from '@/lib/protocol';
import { startOfDayUtc } from '@/lib/validation';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const protocolId = parseInt(id, 10);
    if (isNaN(protocolId)) {
      return NextResponse.json({ error: 'Invalid protocol ID' }, { status: 400 });
    }

    const protocol = await prisma.protocol.findUnique({
      where: { id: protocolId },
      include: {
        logs: {
          orderBy: { date: 'asc' },
        },
        workouts: {
          orderBy: { date: 'asc' },
        },
        // Changes where this is the target protocol (why it was created)
        changesTo: {
          include: {
            fromProtocol: true
          }
        },
      },
    });

    if (!protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    // Observed Outcome
    const observedOutcome = await calculateProtocolOutcome(protocol);

    // Averages and stats
    const logs = protocol.logs;
    const daysCount = logs.length;
    
    let avgPain = 0, avgReflux = 0, compliance = 0, recoveryScore = 0;
    const dayKeyMap: Record<number, string> = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };

    const weights = parseRecoveryWeights(protocol.recoveryWeights);
    const schedule = parseWorkoutSchedule(protocol.workoutSchedule);

    // Safe because Protocol versions are immutable after the first log is attached.
    // Therefore, using the current protocol's target/schedule for all its logs is historically accurate.
    if (daysCount > 0) {
      avgPain = logs.reduce((sum, l) => sum + l.pain, 0) / daysCount;
      avgReflux = logs.reduce((sum, l) => sum + l.reflux, 0) / daysCount;

      const dailySittingCompliances = logs.map(l => {
        const target = protocol.sittingTarget > 0 ? protocol.sittingTarget : 10;
        return Math.min(1, l.sittingBreaksActual / target);
      });
      compliance = dailySittingCompliances.reduce((sum, c) => sum + c, 0) / daysCount;

      let totalScore = 0;
      let scoredDays = 0;

      for (const log of logs) {
        const d = startOfDayUtc(log.date);
        const dayKey = dayKeyMap[d.getUTCDay()];
        const scheduledType = schedule[dayKey];
        const strengthScheduled = !!(scheduledType && scheduledType !== 'REST');
        const strengthCompleted = protocol.workouts.some(w => startOfDayUtc(w.date).getTime() === d.getTime());

        const scoreLog = {
          pain: log.pain,
          reflux: log.reflux,
          walkedToday: log.walkedToday,
          sittingBreaksActual: log.sittingBreaksActual,
          protocol: { sittingTarget: protocol.sittingTarget }
        };

        const state = calculateDailyRecovery(scoreLog, strengthScheduled, strengthCompleted, weights);
        if (state.score !== null) {
          totalScore += state.score;
          scoredDays++;
        }
      }
      recoveryScore = scoredDays > 0 ? totalScore / scoredDays : 0;
    }

    return NextResponse.json({
      protocol: {
        id: protocol.id,
        version: protocol.version,
        active: protocol.active,
        startedAt: protocol.startedAt,
        endedAt: protocol.endedAt,
        walkingTarget: protocol.walkingTarget,
        sittingTarget: protocol.sittingTarget,
        weights,
        schedule,
        logs,
        workouts: protocol.workouts,
        changes: protocol.changesTo,
      },
      stats: {
        days: daysCount,
        avgPain,
        avgReflux,
        compliance,
        recoveryScore,
        observedOutcome,
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
