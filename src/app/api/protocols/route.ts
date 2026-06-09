import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { calculateDailyRecovery, validateWeights, DEFAULT_WEIGHTS } from '@/lib/score';
import { calculateProtocolImpactsBatch } from '@/lib/protocolImpact';
import { startOfDay } from 'date-fns';

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

    const defaultSchedule: Record<string, string> = { mon: 'LOWER', tue: 'UPPER', wed: 'REST', thu: 'LOWER', fri: 'UPPER', sat: 'REST', sun: 'REST' };

    const dayKeyMap: Record<number, string> = {
      0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
    };

    const impacts = await calculateProtocolImpactsBatch(protocols);

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
          impact: null,
        };
      }

      const avgPain = logs.reduce((sum, l) => sum + l.pain, 0) / daysCount;
      const avgReflux = logs.reduce((sum, l) => sum + l.reflux, 0) / daysCount;

      const dailySittingCompliances = logs.map(l => {
        const target = protocol.sittingTarget > 0 ? protocol.sittingTarget : 10;
        return Math.min(1, l.sittingBreaksActual / target);
      });
      const compliance = dailySittingCompliances.reduce((sum, c) => sum + c, 0) / daysCount;

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

      const impact = impacts.get(protocol.id) || null;

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
        impact,
      };
    });

    return NextResponse.json({ protocols: protocolStats });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
