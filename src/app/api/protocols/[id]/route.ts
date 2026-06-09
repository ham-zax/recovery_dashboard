import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { calculateProtocolImpactsBatch } from '@/lib/protocolImpact';
import { calculateDailyRecovery, validateWeights, DEFAULT_WEIGHTS } from '@/lib/score';
import { startOfDay } from 'date-fns';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const protocolId = parseInt(params.id, 10);
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
        fromChanges: {
          include: {
            fromProtocol: true
          }
        },
      },
    });

    if (!protocol) {
      return NextResponse.json({ error: 'Protocol not found' }, { status: 404 });
    }

    // Impact
    const impacts = await calculateProtocolImpactsBatch([protocol]);
    const impact = impacts.get(protocol.id) || null;

    // Averages and stats
    const logs = protocol.logs;
    const daysCount = logs.length;
    
    let avgPain = 0, avgReflux = 0, compliance = 0, recoveryScore = 0;
    
    const defaultSchedule: Record<string, string> = { mon: 'LOWER', tue: 'UPPER', wed: 'REST', thu: 'LOWER', fri: 'UPPER', sat: 'REST', sun: 'REST' };
    const dayKeyMap: Record<number, string> = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' };

    let weights = DEFAULT_WEIGHTS;
    if (protocol.recoveryWeights) {
      try {
        weights = validateWeights(JSON.parse(protocol.recoveryWeights));
      } catch {}
    }

    let schedule = defaultSchedule;
    if (protocol.workoutSchedule) {
      try {
        schedule = JSON.parse(protocol.workoutSchedule);
      } catch {}
    }

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
        const d = startOfDay(new Date(log.date));
        const dayKey = dayKeyMap[d.getDay()];
        const scheduledType = schedule[dayKey];
        const strengthScheduled = !!(scheduledType && scheduledType !== 'REST');
        const strengthCompleted = protocol.workouts.some(w => startOfDay(new Date(w.date)).getTime() === d.getTime());

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
        changes: protocol.fromChanges,
      },
      stats: {
        days: daysCount,
        avgPain,
        avgReflux,
        compliance,
        recoveryScore,
        impact,
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
