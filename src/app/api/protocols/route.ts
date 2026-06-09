import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { calculateProtocolOutcomeBatch } from '@/lib/protocolOutcome';
import { parseRecoveryWeights, calculateDailyRecovery } from '@/lib/score';
import { startOfDay } from 'date-fns';
import { parseWorkoutSchedule } from '@/lib/protocol';

export async function GET() {
  try {
    const protocols = await prisma.protocol.findMany({
      include: {
        logs: {
          orderBy: { date: 'asc' },
        },
        workouts: {
          orderBy: { date: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute outcomes for all protocols efficiently in one pass
    const effectivenessMap = await calculateProtocolOutcomeBatch(protocols);

    const dayKeyMap: Record<number, string> = {
      0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
    };


    const protocolStats = protocols.map(protocol => {
      const logs = protocol.logs;
      const daysCount = logs.length;

      if (daysCount === 0) {
        return {
          id: protocol.id,
          version: protocol.version,
          active: protocol.active,
          days: 0,
          avgPain: 0,
          avgReflux: 0,
          compliance: 0,
          recoveryScore: 0,
          observedOutcome: null,
        };
      }

      const avgPain = logs.reduce((sum, l) => sum + l.pain, 0) / daysCount;
      const avgReflux = logs.reduce((sum, l) => sum + l.reflux, 0) / daysCount;

      const dailySittingCompliances = logs.map(l => {
        const target = protocol.sittingTarget > 0 ? protocol.sittingTarget : 10;
        return Math.min(1, l.sittingBreaksActual / target);
      });
      const compliance = dailySittingCompliances.reduce((sum, c) => sum + c, 0) / daysCount;

      const weights = parseRecoveryWeights(protocol.recoveryWeights);
      const schedule = parseWorkoutSchedule(protocol.workoutSchedule);

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

      const recoveryScore = scoredDays > 0 ? totalScore / scoredDays : 0;



      return {
        id: protocol.id,
        version: protocol.version,
        active: protocol.active,
        startDate: protocol.startedAt.toISOString(),
        endDate: protocol.endedAt ? protocol.endedAt.toISOString() : undefined,
        days: daysCount,
        avgPain,
        avgReflux,
        compliance,
        recoveryScore,
        observedOutcome: effectivenessMap.get(protocol.id) || null,
      };
    });

    return NextResponse.json({ 
      protocols: protocolStats
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
