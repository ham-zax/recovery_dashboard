import { prisma } from './prisma';
import { calculateDailyRecovery, DEFAULT_WEIGHTS, validateWeights, ScoreWeights } from './score';
import { startOfDay } from 'date-fns';
import { DailyLog, WorkoutSession, Protocol } from '../generated/prisma';

export interface ImpactMetrics {
  avgPain: number;
  avgReflux: number;
  compliance: number;
  recoveryScore: number;
  days: number;
}

export interface ProtocolOutcome {
  protocolId: number;
  daysActive: number;
  
  first7Days: ImpactMetrics | null;
  last7Days: ImpactMetrics | null;

  painDelta: number | null;
  refluxDelta: number | null;
  recoveryDelta: number | null;
  complianceDelta: number | null;

  confidence: 'High' | 'Medium' | 'Low';
  observedOutcome: 'Improving' | 'Stable' | 'Worsening' | 'Insufficient Data';
}

const dayKeyMap: Record<number, string> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
};

const MIN_PROTOCOL_DAYS = 14;

function computeMetrics(
  logs: DailyLog[],
  workouts: WorkoutSession[],
  sittingTarget: number,
  weights: ScoreWeights,
  schedule: Record<string, string>
): ImpactMetrics | null {
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

export function evaluateObservedOutcome(
  painDelta: number,
  refluxDelta: number,
  recoveryDelta: number,
  complianceDelta: number
): 'Improving' | 'Stable' | 'Worsening' {
  let score = 0;
  
  if (painDelta <= -1.0) score += 2;
  else if (painDelta <= -0.5) score += 1;
  else if (painDelta >= 1.0) score -= 2;
  else if (painDelta >= 0.5) score -= 1;

  if (refluxDelta <= -1.0) score += 1;
  else if (refluxDelta >= 1.0) score -= 1;

  if (recoveryDelta >= 5) score += 2;
  else if (recoveryDelta >= 2) score += 1;
  else if (recoveryDelta <= -5) score -= 2;
  else if (recoveryDelta <= -2) score -= 1;

  if (complianceDelta >= 0.1) score += 1;
  else if (complianceDelta <= -0.1) score -= 1;

  if (score >= 2) return 'Improving';
  if (score <= -2) return 'Worsening';
  return 'Stable';
}

export async function calculateProtocolOutcome(protocol: Protocol): Promise<ProtocolOutcome> {
  const logs = await prisma.dailyLog.findMany({
    where: { protocolId: protocol.id },
    orderBy: { date: 'asc' },
  });

  const workouts = await prisma.workoutSession.findMany({
    where: { protocolId: protocol.id },
    orderBy: { date: 'asc' },
  });

  if (logs.length < MIN_PROTOCOL_DAYS) {
    return {
      protocolId: protocol.id,
      daysActive: logs.length,
      first7Days: null,
      last7Days: null,
      painDelta: null,
      refluxDelta: null,
      recoveryDelta: null,
      complianceDelta: null,
      confidence: 'Low',
      observedOutcome: 'Insufficient Data'
    };
  }

  const defaultSchedule = { mon: 'LOWER', tue: 'UPPER', wed: 'REST', thu: 'LOWER', fri: 'UPPER', sat: 'REST', sun: 'REST' };
  let schedule = defaultSchedule;
  if (protocol.workoutSchedule) {
    try { schedule = JSON.parse(protocol.workoutSchedule); } catch {}
  }

  let weights = DEFAULT_WEIGHTS;
  if (protocol.recoveryWeights) {
    try { weights = validateWeights(JSON.parse(protocol.recoveryWeights)); } catch {}
  }

  const first7Logs = logs.slice(0, 7);
  const last7Logs = logs.slice(-7);

  const first7Days = computeMetrics(first7Logs, workouts, protocol.sittingTarget, weights, schedule);
  const last7Days = computeMetrics(last7Logs, workouts, protocol.sittingTarget, weights, schedule);

  if (!first7Days || !last7Days) {
    return {
      protocolId: protocol.id,
      daysActive: logs.length,
      first7Days: null,
      last7Days: null,
      painDelta: null,
      refluxDelta: null,
      recoveryDelta: null,
      complianceDelta: null,
      confidence: 'Low',
      observedOutcome: 'Insufficient Data'
    };
  }

  const painDelta = last7Days.avgPain - first7Days.avgPain;
  const refluxDelta = last7Days.avgReflux - first7Days.avgReflux;
  const recoveryDelta = last7Days.recoveryScore - first7Days.recoveryScore;
  const complianceDelta = last7Days.compliance - first7Days.compliance;

  const observedOutcome = evaluateObservedOutcome(painDelta, refluxDelta, recoveryDelta, complianceDelta);
  
  // Confidence scaling based on days active
  let confidence: 'High' | 'Medium' | 'Low' = 'Low';
  if (logs.length >= 30) confidence = 'High';
  else if (logs.length >= 21) confidence = 'Medium';
  else if (logs.length >= 14) confidence = 'Low'; // just crossed the minimum

  return {
    protocolId: protocol.id,
    daysActive: logs.length,
    first7Days,
    last7Days,
    painDelta,
    refluxDelta,
    recoveryDelta,
    complianceDelta,
    confidence,
    observedOutcome
  };
}

export async function calculateProtocolOutcomeBatch(protocols: Protocol[]): Promise<Map<number, ProtocolOutcome>> {
  const result = new Map<number, ProtocolOutcome>();
  
  // To avoid N+1 queries we fetch everything up front.
  if (protocols.length === 0) return result;
  
  const protocolIds = protocols.map(p => p.id);
  const allLogs = await prisma.dailyLog.findMany({
    where: { protocolId: { in: protocolIds } },
    orderBy: { date: 'asc' },
  });
  
  const allWorkouts = await prisma.workoutSession.findMany({
    where: { protocolId: { in: protocolIds } },
    orderBy: { date: 'asc' },
  });

  const logsByProtocol = new Map<number, DailyLog[]>();
  const workoutsByProtocol = new Map<number, WorkoutSession[]>();
  for (const p of protocols) {
    logsByProtocol.set(p.id, []);
    workoutsByProtocol.set(p.id, []);
  }

  for (const log of allLogs) {
    if (log.protocolId && logsByProtocol.has(log.protocolId)) {
      logsByProtocol.get(log.protocolId)!.push(log);
    }
  }

  for (const workout of allWorkouts) {
    if (workout.protocolId && workoutsByProtocol.has(workout.protocolId)) {
      workoutsByProtocol.get(workout.protocolId)!.push(workout);
    }
  }

  for (const protocol of protocols) {
    const logs = logsByProtocol.get(protocol.id) || [];
    const workouts = workoutsByProtocol.get(protocol.id) || [];

    if (logs.length < MIN_PROTOCOL_DAYS) {
      result.set(protocol.id, {
        protocolId: protocol.id,
        daysActive: logs.length,
        first7Days: null,
        last7Days: null,
        painDelta: null,
        refluxDelta: null,
        recoveryDelta: null,
        complianceDelta: null,
        confidence: 'Low',
        observedOutcome: 'Insufficient Data'
      });
      continue;
    }

    const defaultSchedule = { mon: 'LOWER', tue: 'UPPER', wed: 'REST', thu: 'LOWER', fri: 'UPPER', sat: 'REST', sun: 'REST' };
    let schedule = defaultSchedule;
    if (protocol.workoutSchedule) {
      try { schedule = JSON.parse(protocol.workoutSchedule); } catch {}
    }

    let weights = DEFAULT_WEIGHTS;
    if (protocol.recoveryWeights) {
      try { weights = validateWeights(JSON.parse(protocol.recoveryWeights)); } catch {}
    }

    const first7Logs = logs.slice(0, 7);
    const last7Logs = logs.slice(-7);

    const first7Days = computeMetrics(first7Logs, workouts, protocol.sittingTarget, weights, schedule);
    const last7Days = computeMetrics(last7Logs, workouts, protocol.sittingTarget, weights, schedule);

    if (!first7Days || !last7Days) {
      result.set(protocol.id, {
        protocolId: protocol.id,
        daysActive: logs.length,
        first7Days: null,
        last7Days: null,
        painDelta: null,
        refluxDelta: null,
        recoveryDelta: null,
        complianceDelta: null,
        confidence: 'Low',
        observedOutcome: 'Insufficient Data'
      });
      continue;
    }

    const painDelta = last7Days.avgPain - first7Days.avgPain;
    const refluxDelta = last7Days.avgReflux - first7Days.avgReflux;
    const recoveryDelta = last7Days.recoveryScore - first7Days.recoveryScore;
    const complianceDelta = last7Days.compliance - first7Days.compliance;

    const observedOutcome = evaluateObservedOutcome(painDelta, refluxDelta, recoveryDelta, complianceDelta);
    
    let confidence: 'High' | 'Medium' | 'Low' = 'Low';
    if (logs.length >= 30) confidence = 'High';
    else if (logs.length >= 21) confidence = 'Medium';
    else if (logs.length >= 14) confidence = 'Low';

    result.set(protocol.id, {
      protocolId: protocol.id,
      daysActive: logs.length,
      first7Days,
      last7Days,
      painDelta,
      refluxDelta,
      recoveryDelta,
      complianceDelta,
      confidence,
      observedOutcome
    });
  }

  return result;
}
