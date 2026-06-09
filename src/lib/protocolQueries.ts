import { prisma } from './prisma';
import { calculateProtocolOutcomeBatch } from './protocolOutcome';
import { parseRecoveryWeights, calculateDailyRecovery } from './score';
import { startOfDay } from 'date-fns';
import { parseWorkoutSchedule, parseProtocolChanges } from './protocol';

export async function getProtocolStats() {
  const protocols = await prisma.protocol.findMany({
    include: {
      logs: { orderBy: { date: 'asc' } },
      workouts: { orderBy: { date: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const effectivenessMap = await calculateProtocolOutcomeBatch(protocols);

  const dayKeyMap: Record<number, string> = {
    0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
  };

  return protocols.map(protocol => {
    const logs = protocol.logs;
    const daysCount = logs.length;

    if (daysCount === 0) {
      return {
        id: protocol.id,
        version: protocol.version,
        active: protocol.active,
        startDate: protocol.startedAt.toISOString(),
        endDate: protocol.endedAt ? protocol.endedAt.toISOString() : undefined,
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
}

export async function getProtocolTimeline(limit: number = 50, offset: number = 0) {
  const protocolChanges = await prisma.protocolChange.findMany({
    include: {
      fromProtocol: true,
      toProtocol: true,
    },
    orderBy: { changedAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return protocolChanges.map(pc => {
    let parsedChanges = 'Configuration updated';
    try {
      const c = parseProtocolChanges(pc.changes);
      parsedChanges = Object.keys(c)
        .map(k => {
           if (k === 'action') return c[k];
           const val = c[k] as { from: unknown; to: unknown };
           return `${k}: ${JSON.stringify(val.from)} → ${JSON.stringify(val.to)}`;
        })
        .join(', ');
    } catch {}

    return {
      id: pc.id,
      date: pc.changedAt.toISOString(),
      fromVersion: pc.fromProtocol.version,
      toVersion: pc.toProtocol.version,
      reason: pc.reason,
      notes: pc.notes,
      changes: parsedChanges,
    };
  });
}
