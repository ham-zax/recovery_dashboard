import { prisma } from '@/lib/prisma';
import { startOfDay, subDays, format, addDays } from 'date-fns';
import { calculateDailyRecovery, ScoreWeights, DEFAULT_WEIGHTS, validateWeights } from './score';
import { getPainState, getRefluxState, getStrengthState } from './metricInterpretation';
import { generateTrendInsight, generateComplianceInsight } from './dashboardInsights';
import { eventProvider } from './recoveryEvents';
import { getActiveProtocol, parseWorkoutSchedule } from './protocol';

interface DailyLog {
  id: number;
  date: Date;
  pain: number;
  reflux: number;
  walkedToday: boolean;
  strengthToday: boolean;
  sleepHours: number;
  sittingBreaksActual: number;
  protocol: { sittingTarget: number };
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

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
  while (current < endDate) {
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

export async function getDashboardData(days: number) {
  const today = startOfDay(new Date());
  const limitDate = subDays(today, days - 1);
  const prevLimitDate = subDays(today, days * 2 - 1);

  // Fetch protocol for weights
  const protocol = await getActiveProtocol();
  let weights: ScoreWeights = DEFAULT_WEIGHTS;
  if (protocol.recoveryWeights) {
    try {
      const parsed = JSON.parse(protocol.recoveryWeights);
      weights = validateWeights(parsed);
    } catch {
      // fallback to default
    }
  }

  // Parse workout schedule
  const schedule = parseWorkoutSchedule(protocol.workoutSchedule);

  // Fetch current period logs
  const currentLogs = await prisma.dailyLog.findMany({
    where: {
      date: {
        gte: limitDate,
      },
    },
    include: { protocol: true },
    orderBy: { date: 'asc' },
  });

  // Fetch previous period logs
  const previousLogs = await prisma.dailyLog.findMany({
    where: {
      date: {
        gte: prevLimitDate,
        lt: limitDate,
      },
    },
    include: { protocol: true },
    orderBy: { date: 'asc' },
  });

  // Fetch workouts
  const currentWorkouts = await prisma.workoutSession.findMany({
    where: {
      date: {
        gte: limitDate,
      },
    },
  });

  const previousWorkouts = await prisma.workoutSession.findMany({
    where: {
      date: {
        gte: prevLimitDate,
        lt: limitDate,
      },
    },
  });

  const protocolChanges = await prisma.protocolChange.findMany({
    where: {
      changedAt: {
        gte: limitDate,
      },
    },
  });

  // Calculations for current period
  const totalWalks = currentLogs.filter(l => l.walkedToday).length;
  const totalWorkouts = currentWorkouts.length;
  const expectedWorkouts = countScheduledWorkouts(limitDate, addDays(today, 1), schedule);

  // Find today's log for the Recovery Score calculation
  const todayLog = currentLogs.find(l => startOfDay(new Date(l.date)).getTime() === today.getTime()) || null;
  
  const dayOfWeek = today.getDay();
  const dayKey = dayKeyMap[dayOfWeek];
  const scheduledType = schedule[dayKey];
  const strengthScheduled = scheduledType && scheduledType !== 'REST';
  
  // Did they complete a workout today?
  const strengthCompleted = currentWorkouts.some(w => startOfDay(new Date(w.date)).getTime() === today.getTime());

  const recoveryState = calculateDailyRecovery(todayLog, !!strengthScheduled, strengthCompleted, weights);

  // Helper to calculate average of a numeric property
  const getAverage = (logs: DailyLog[], key: 'pain' | 'reflux' | 'sleepHours') => {
    if (logs.length === 0) return 0;
    return logs.reduce((acc, l) => acc + l[key], 0) / logs.length;
  };

  const getSittingBreaksAverage = (logs: DailyLog[], key: 'sittingBreaksActual') => {
    if (logs.length === 0) return 0;
    return logs.reduce((acc, l) => acc + l[key], 0) / logs.length;
  };

  const getSittingTargetAverage = (logs: DailyLog[]) => {
    if (logs.length === 0) return 0;
    return logs.reduce((acc, l) => acc + l.protocol.sittingTarget, 0) / logs.length;
  };

  const getSittingComplianceAverage = (logs: DailyLog[]) => {
    if (logs.length === 0) return 0;
    const compliances = logs.map(l => {
      const target = l.protocol.sittingTarget > 0 ? l.protocol.sittingTarget : 10;
      return Math.min(1, l.sittingBreaksActual / target);
    });
    return compliances.reduce((acc, c) => acc + c, 0) / compliances.length;
  };

  // Current averages
  const currentAvgPain = getAverage(currentLogs, 'pain');
  const currentAvgReflux = getAverage(currentLogs, 'reflux');
  const currentAvgSittingActual = getSittingBreaksAverage(currentLogs, 'sittingBreaksActual');
  const currentAvgSittingTarget = getSittingTargetAverage(currentLogs);
  const currentAvgSittingCompliance = getSittingComplianceAverage(currentLogs);

  // Previous averages / counts
  const prevAvgPain = getAverage(previousLogs, 'pain');
  const prevAvgReflux = getAverage(previousLogs, 'reflux');
  const prevAvgSittingActual = getSittingBreaksAverage(previousLogs, 'sittingBreaksActual');
  const prevAvgSittingCompliance = getSittingComplianceAverage(previousLogs);
  const prevWalks = previousLogs.filter(l => l.walkedToday).length;
  const prevWorkouts = previousWorkouts.length;

  const hasPrevLogs = previousLogs.length > 0;

  // Delta helpers
  const getDeltaStringAndTrend = (
    current: number,
    prev: number,
    hasPrevData: boolean
  ) => {
    if (!hasPrevData) {
      return { delta: null, trend: null };
    }
    const diff = current - prev;
    const deltaStr = diff === 0 ? '0' : diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`;
    let trend: 'up' | 'down' | 'same' = 'same';
    if (diff > 0) trend = 'up';
    if (diff < 0) trend = 'down';

    return { delta: deltaStr, trend };
  };

  // Metrics details
  const painStats = getDeltaStringAndTrend(currentAvgPain, prevAvgPain, hasPrevLogs);
  const refluxStats = getDeltaStringAndTrend(currentAvgReflux, prevAvgReflux, hasPrevLogs);
  const walkingStats = getDeltaStringAndTrend(totalWalks, prevWalks, hasPrevLogs);
  const strengthStats = getDeltaStringAndTrend(totalWorkouts, prevWorkouts, hasPrevLogs);
  const complianceStats = getDeltaStringAndTrend(
    currentAvgSittingCompliance * 100,
    prevAvgSittingCompliance * 100,
    hasPrevLogs
  );
  const sittingBreaksStats = getDeltaStringAndTrend(currentAvgSittingActual, prevAvgSittingActual, hasPrevLogs);

  // Generate chart data for the last `days` days
  const chartData = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = startOfDay(subDays(today, i));
    const log = currentLogs.find(l => startOfDay(new Date(l.date)).getTime() === d.getTime());
    chartData.push({
      date: format(d, 'yyyy-MM-dd'),
      displayDate: format(d, 'MMM dd'),
      pain: log ? log.pain : null,
      walked: log ? (log.walkedToday ? 1 : 0) : null,
      reflux: log ? log.reflux : null,
      compliance: log ? Math.min(100, Math.round((log.sittingBreaksActual / (log.protocol.sittingTarget > 0 ? log.protocol.sittingTarget : 10)) * 100)) : 0,
    });
  }

  // Generate Narrative Insights
  const insights = {
    trend: generateTrendInsight(painStats.trend, walkingStats.trend),
    compliance: generateComplianceInsight(complianceStats.trend, currentAvgSittingCompliance * 100),
  };

  // Calculate historical seed state efficiently without unbounded relationship queries
  const pastLogsForSeed = await prisma.dailyLog.findMany({ 
    where: { date: { lt: limitDate } },
    select: { id: true, date: true, walkedToday: true, pain: true, reflux: true },
    orderBy: { date: 'asc' } 
  });
  const pastWorkoutsForSeed = await prisma.workoutSession.findMany({ 
    where: { date: { lt: limitDate } },
    select: { id: true, date: true },
    orderBy: { date: 'asc' } 
  });

  const seedState = eventProvider.computeSeedState(pastLogsForSeed, pastWorkoutsForSeed);

  // Generate point-in-time Recovery Events ONLY for the current window
  const events = eventProvider.getEvents(currentLogs, currentWorkouts, protocolChanges, seedState);

  return {
    recoveryState,
    periodDays: days,
    metrics: {
      pain: {
        value: `${currentAvgPain.toFixed(1)}/10`,
        stateLabel: getPainState(currentAvgPain),
        raw: currentAvgPain,
        ...painStats,
      },
      walking: {
        value: `${totalWalks} logs`,
        raw: totalWalks,
        ...walkingStats,
      },
      strength: {
        value: `${totalWorkouts} / ${expectedWorkouts}`,
        stateLabel: getStrengthState(totalWorkouts, expectedWorkouts),
        raw: totalWorkouts,
        ...strengthStats,
      },
      compliance: {
        value: `${Math.round(currentAvgSittingCompliance * 100)}%`,
        raw: currentAvgSittingCompliance * 100,
        ...complianceStats,
      },
      reflux: {
        value: `${currentAvgReflux.toFixed(1)}/10`,
        stateLabel: getRefluxState(currentAvgReflux),
        raw: currentAvgReflux,
        ...refluxStats,
      },
      sittingBreaks: {
        value: `${currentAvgSittingActual.toFixed(1)} / ${currentAvgSittingTarget.toFixed(1)}`,
        stateLabel: currentAvgSittingActual >= currentAvgSittingTarget ? 'Optimal' : 'Suboptimal',
        raw: currentAvgSittingActual,
        ...sittingBreaksStats,
      },
    },
    insights,
    events: eventProvider.selectDashboardEvents(events, 3), // return top 3 most important dashboard-eligible events
    chartData,
  };
}
