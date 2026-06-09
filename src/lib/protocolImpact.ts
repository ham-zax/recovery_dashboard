import { prisma } from './prisma';
import { subDays, addDays, startOfDay, endOfDay } from 'date-fns';
import { calculateDailyRecovery, DEFAULT_WEIGHTS, validateWeights, ScoreWeights } from './score';

interface ImpactMetrics {
  avgPain: number;
  avgReflux: number;
  compliance: number;
  recoveryScore: number;
  days: number;
}

export interface ProtocolImpact {
  protocolId: number;
  version: string;
  changeReason: string | null;
  changedAt: string | null;
  before: ImpactMetrics | null;
  after: ImpactMetrics | null;
  delta: ImpactMetrics | null;
  confidence: 'High' | 'Medium' | 'Low' | null;
  reason: string | null;
}

function calculateConfidence(before: ImpactMetrics | null, after: ImpactMetrics | null): { confidence: 'High' | 'Medium' | 'Low' | null, reason: string | null } {
  if (!before || !after) {
    return { confidence: null, reason: null };
  }

  if (after.days < 7) {
    return { confidence: 'Low', reason: `Only ${after.days} check-ins recorded after the change.` };
  }
  if (before.days < 7) {
    return { confidence: 'Low', reason: `Only ${before.days} check-ins recorded before the change.` };
  }

  if (after.compliance < 0.5) {
    return { confidence: 'Low', reason: `Poor protocol compliance (${Math.round(after.compliance * 100)}%) after the change.` };
  }

  if (after.days >= 12 && before.days >= 12 && after.compliance >= 0.7) {
    return { confidence: 'High', reason: `${after.days}/14 days logged with good compliance.` };
  }

  return { confidence: 'Medium', reason: `Adequate check-in coverage (${after.days}/14 days).` };
}

const dayKeyMap: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};

async function computeMetricsForWindow(
  startDate: Date,
  endDate: Date,
  sittingTarget: number,
  weights: ScoreWeights,
  schedule: Record<string, string>
): Promise<ImpactMetrics | null> {
  const logs = await prisma.dailyLog.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: 'asc' },
  });

  const workouts = await prisma.workoutSession.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  if (logs.length === 0) return null;

  const daysCount = logs.length;
  const avgPain = logs.reduce((sum, l) => sum + l.pain, 0) / daysCount;
  const avgReflux = logs.reduce((sum, l) => sum + l.reflux, 0) / daysCount;

  const compliances = logs.map(l => {
    const target = sittingTarget > 0 ? sittingTarget : 10;
    return Math.min(1, l.sittingBreaksActual / target);
  });
  const compliance = compliances.reduce((sum, c) => sum + c, 0) / daysCount;

  let totalScore = 0;
  let scoredDays = 0;

  for (const log of logs) {
    const d = startOfDay(new Date(log.date));
    const dayKey = dayKeyMap[d.getDay()];
    const scheduledType = schedule[dayKey];
    const strengthScheduled = !!(scheduledType && scheduledType !== 'REST');
    const strengthCompleted = workouts.some(w => startOfDay(new Date(w.date)).getTime() === d.getTime());

    const scoreLog = {
      pain: log.pain,
      reflux: log.reflux,
      walkedToday: log.walkedToday,
      sittingBreaksActual: log.sittingBreaksActual,
      protocol: { sittingTarget }
    };

    const state = calculateDailyRecovery(scoreLog, strengthScheduled, strengthCompleted, weights);
    if (state.score !== null) {
      totalScore += state.score;
      scoredDays++;
    }
  }

  const recoveryScore = scoredDays > 0 ? totalScore / scoredDays : 0;

  return {
    avgPain,
    avgReflux,
    compliance,
    recoveryScore,
    days: daysCount,
  };
}

import { Protocol, DailyLog, WorkoutSession } from '../generated/prisma';

export async function calculateProtocolImpactsBatch(protocols: Protocol[]): Promise<Map<number, ProtocolImpact>> {
  const result = new Map<number, ProtocolImpact>();
  if (protocols.length === 0) return result;

  const protocolIds = protocols.map(p => p.id);
  
  const changes = await prisma.protocolChange.findMany({
    where: { toProtocolId: { in: protocolIds } },
    orderBy: { changedAt: 'asc' },
  });

  const prevProtocolIds = changes.map(c => c.fromProtocolId);
  const prevProtocols = await prisma.protocol.findMany({
    where: { id: { in: prevProtocolIds } },
  });

  let minDate = new Date(8640000000000000);
  let maxDate = new Date(-8640000000000000);

  for (const p of protocols) {
    const beforeStart = startOfDay(subDays(p.startedAt, 14));
    const afterEnd = endOfDay(addDays(p.startedAt, 13));
    if (beforeStart < minDate) minDate = beforeStart;
    if (afterEnd > maxDate) maxDate = afterEnd;
  }

  const allLogs = await prisma.dailyLog.findMany({
    where: { date: { gte: minDate, lte: maxDate } },
    orderBy: { date: 'asc' },
  });

  const allWorkouts = await prisma.workoutSession.findMany({
    where: { date: { gte: minDate, lte: maxDate } },
  });

  for (const protocol of protocols) {
    const change = changes.find(c => c.toProtocolId === protocol.id) || null;
    const start = protocol.startedAt;

    const beforeStart = startOfDay(subDays(start, 14));
    const beforeEnd = endOfDay(subDays(start, 1));
    const afterStart = startOfDay(start);
    const afterEnd = endOfDay(addDays(start, 13));

    const defaultSchedule = { mon: 'LOWER', tue: 'UPPER', wed: 'REST', thu: 'LOWER', fri: 'UPPER', sat: 'REST', sun: 'REST' };
    let schedule = defaultSchedule;
    if (protocol.workoutSchedule) {
      try { schedule = JSON.parse(protocol.workoutSchedule); } catch {}
    }

    let afterWeights = DEFAULT_WEIGHTS;
    if (protocol.recoveryWeights) {
      try { afterWeights = validateWeights(JSON.parse(protocol.recoveryWeights)); } catch {}
    }

    let beforeSittingTarget = protocol.sittingTarget;
    let beforeWeights = afterWeights;
    let beforeSchedule = schedule;

    if (change) {
      const prevProtocol = prevProtocols.find(p => p.id === change.fromProtocolId);
      if (prevProtocol) {
        beforeSittingTarget = prevProtocol.sittingTarget;
        if (prevProtocol.recoveryWeights) {
          try { beforeWeights = validateWeights(JSON.parse(prevProtocol.recoveryWeights)); } catch {}
        }
        if (prevProtocol.workoutSchedule) {
          try { beforeSchedule = JSON.parse(prevProtocol.workoutSchedule); } catch {}
        }
      }
    }

    const filterLogs = (s: Date, e: Date) => allLogs.filter(l => l.date >= s && l.date <= e);
    const filterWorkouts = (s: Date, e: Date) => allWorkouts.filter(w => w.date >= s && w.date <= e);

    const computeMem = (logs: DailyLog[], workouts: WorkoutSession[], target: number, weights: ScoreWeights, sched: Record<string, string>): ImpactMetrics | null => {
      if (logs.length === 0) return null;
      const daysCount = logs.length;
      const avgPain = logs.reduce((sum, l) => sum + l.pain, 0) / daysCount;
      const avgReflux = logs.reduce((sum, l) => sum + l.reflux, 0) / daysCount;
      const compliances = logs.map(l => Math.min(1, l.sittingBreaksActual / (target > 0 ? target : 10)));
      const compliance = compliances.reduce((sum, c) => sum + c, 0) / daysCount;

      let totalScore = 0;
      let scoredDays = 0;
      for (const log of logs) {
        const d = startOfDay(new Date(log.date));
        const dayKey = dayKeyMap[d.getDay()];
        const scheduledType = sched[dayKey];
        const strengthScheduled = !!(scheduledType && scheduledType !== 'REST');
        const strengthCompleted = workouts.some(w => startOfDay(new Date(w.date)).getTime() === d.getTime());
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const scoreLog: any = { pain: log.pain, reflux: log.reflux, walkedToday: log.walkedToday, sittingBreaksActual: log.sittingBreaksActual, protocol: { sittingTarget: target } };
        const state = calculateDailyRecovery(scoreLog, strengthScheduled, strengthCompleted, weights);
        if (state.score !== null) { totalScore += state.score; scoredDays++; }
      }
      return { avgPain, avgReflux, compliance, recoveryScore: scoredDays > 0 ? totalScore / scoredDays : 0, days: daysCount };
    };

    const beforeMetrics = computeMem(filterLogs(beforeStart, beforeEnd), filterWorkouts(beforeStart, beforeEnd), beforeSittingTarget, beforeWeights, beforeSchedule);
    const afterMetrics = computeMem(filterLogs(afterStart, afterEnd), filterWorkouts(afterStart, afterEnd), protocol.sittingTarget, afterWeights, schedule);

    let delta: ImpactMetrics | null = null;
    if (beforeMetrics && afterMetrics) {
      delta = {
        avgPain: afterMetrics.avgPain - beforeMetrics.avgPain,
        avgReflux: afterMetrics.avgReflux - beforeMetrics.avgReflux,
        compliance: afterMetrics.compliance - beforeMetrics.compliance,
        recoveryScore: afterMetrics.recoveryScore - beforeMetrics.recoveryScore,
        days: 0,
      };
    }

    const { confidence, reason } = calculateConfidence(beforeMetrics, afterMetrics);

    result.set(protocol.id, {
      protocolId: protocol.id,
      version: protocol.version,
      changeReason: change?.reason || null,
      changedAt: change ? change.changedAt.toISOString() : protocol.startedAt.toISOString(),
      before: beforeMetrics,
      after: afterMetrics,
      delta,
      confidence,
      reason,
    });
  }

  return result;
}

export async function calculateProtocolImpact(protocolId: number): Promise<ProtocolImpact | null> {
  const protocol = await prisma.protocol.findUnique({
    where: { id: protocolId },
    include: {
      changesTo: {
        orderBy: { changedAt: 'asc' },
        take: 1, // The change that created this protocol
      }
    }
  });

  if (!protocol) return null;

  const change = protocol.changesTo.length > 0 ? protocol.changesTo[0] : null;
  const start = protocol.startedAt;

  // We analyze the 14 days before the protocol started
  const beforeStart = startOfDay(subDays(start, 14));
  const beforeEnd = endOfDay(subDays(start, 1));

  // And the 14 days after the protocol started
  const afterStart = startOfDay(start);
  const afterEnd = endOfDay(addDays(start, 13));

  const defaultSchedule = { mon: 'LOWER', tue: 'UPPER', wed: 'REST', thu: 'LOWER', fri: 'UPPER', sat: 'REST', sun: 'REST' };
  let schedule = defaultSchedule;
  if (protocol.workoutSchedule) {
    try {
      schedule = JSON.parse(protocol.workoutSchedule);
    } catch {}
  }

  // Compute weights for 'after' window (using new protocol's weights)
  let afterWeights = DEFAULT_WEIGHTS;
  if (protocol.recoveryWeights) {
    try {
      afterWeights = validateWeights(JSON.parse(protocol.recoveryWeights));
    } catch {}
  }

  // Compute weights for 'before' window (using previous protocol if possible, but for simplicity we'll just evaluate both using the active weights of their respective protocols)
  let beforeSittingTarget = protocol.sittingTarget;
  let beforeWeights = afterWeights;
  
  let beforeSchedule = schedule;
  if (change) {
    const prevProtocol = await prisma.protocol.findUnique({ where: { id: change.fromProtocolId } });
    if (prevProtocol) {
      beforeSittingTarget = prevProtocol.sittingTarget;
      if (prevProtocol.recoveryWeights) {
        try {
          beforeWeights = validateWeights(JSON.parse(prevProtocol.recoveryWeights));
        } catch {}
      }
      if (prevProtocol.workoutSchedule) {
        try {
          beforeSchedule = JSON.parse(prevProtocol.workoutSchedule);
        } catch {}
      }
    }
  }

  const beforeMetrics = await computeMetricsForWindow(beforeStart, beforeEnd, beforeSittingTarget, beforeWeights, beforeSchedule);
  const afterMetrics = await computeMetricsForWindow(afterStart, afterEnd, protocol.sittingTarget, afterWeights, schedule);

  let delta: ImpactMetrics | null = null;

  if (beforeMetrics && afterMetrics) {
    delta = {
      avgPain: afterMetrics.avgPain - beforeMetrics.avgPain,
      avgReflux: afterMetrics.avgReflux - beforeMetrics.avgReflux,
      compliance: afterMetrics.compliance - beforeMetrics.compliance,
      recoveryScore: afterMetrics.recoveryScore - beforeMetrics.recoveryScore,
      days: 0, // Delta doesn't need days
    };
  }

  const { confidence, reason } = calculateConfidence(beforeMetrics, afterMetrics);

  return {
    protocolId: protocol.id,
    version: protocol.version,
    changeReason: change?.reason || null,
    changedAt: change ? change.changedAt.toISOString() : protocol.startedAt.toISOString(),
    before: beforeMetrics,
    after: afterMetrics,
    delta,
    confidence,
    reason,
  };
}
