import { prisma } from '@/lib/prisma';
import { startOfDay, subDays, format, addDays } from 'date-fns';
import { calculateDailyRecovery, ScoreWeights, DEFAULT_WEIGHTS } from './score';

interface DailyLog {
  id: number;
  date: Date;
  pain: number;
  reflux: number;
  walkedToday: boolean;
  strengthToday: boolean;
  sleepHours: number;
  sittingBreaksTarget: number;
  sittingBreaksActual: number;
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
  const limitDate = subDays(today, days);
  const prevLimitDate = subDays(today, days * 2);

  // Fetch settings
  const settings = await prisma.setting.findMany();
  const settingsMap = new Map(settings.map(s => [s.key, s.value]));

  // Parse weights
  let weights: ScoreWeights = DEFAULT_WEIGHTS;
  if (settingsMap.has('recovery_score_weights')) {
    try {
      const parsed = JSON.parse(settingsMap.get('recovery_score_weights')!);
      // Ensure we have the right keys; if not, fallback to default
      if ('pain' in parsed && 'reflux' in parsed) {
        weights = parsed;
      }
    } catch {
      // fallback to default
    }
  }

  // Parse workout schedule
  const defaultSchedule = { mon: 'LOWER', tue: 'UPPER', wed: 'REST', thu: 'LOWER', fri: 'UPPER', sat: 'REST', sun: 'REST' };
  const schedule = settingsMap.has('workout_schedule')
    ? JSON.parse(settingsMap.get('workout_schedule')!)
    : defaultSchedule;

  // Fetch current period logs
  const currentLogs = await prisma.dailyLog.findMany({
    where: {
      date: {
        gte: limitDate,
      },
    },
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

  // Calculations for current period
  const totalWalks = currentLogs.filter(l => l.walkedToday).length;
  const totalWorkouts = currentWorkouts.length;
  const expectedWorkouts = countScheduledWorkouts(limitDate, addDays(today, 1), schedule);

  // Sitting compliance for each day: actual / target capped at 1.0
  const dailySittingCompliances = currentLogs.map(l => {
    const target = l.sittingBreaksTarget > 0 ? l.sittingBreaksTarget : 10;
    return Math.min(1, l.sittingBreaksActual / target);
  });

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

  const getSittingBreaksAverage = (logs: DailyLog[], key: 'sittingBreaksActual' | 'sittingBreaksTarget') => {
    if (logs.length === 0) return 0;
    return logs.reduce((acc, l) => acc + l[key], 0) / logs.length;
  };

  const getSittingComplianceAverage = (logs: DailyLog[]) => {
    if (logs.length === 0) return 0;
    const compliances = logs.map(l => {
      const target = l.sittingBreaksTarget > 0 ? l.sittingBreaksTarget : 10;
      return Math.min(1, l.sittingBreaksActual / target);
    });
    return compliances.reduce((acc, c) => acc + c, 0) / compliances.length;
  };

  // Current averages
  const currentAvgPain = getAverage(currentLogs, 'pain');
  const currentAvgReflux = getAverage(currentLogs, 'reflux');
  const currentAvgSittingActual = getSittingBreaksAverage(currentLogs, 'sittingBreaksActual');
  const currentAvgSittingTarget = getSittingBreaksAverage(currentLogs, 'sittingBreaksTarget');
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
      compliance: log ? 100 : 0,
    });
  }

  return {
    recoveryState,
    periodDays: days,
    metrics: {
      pain: {
        value: `${currentAvgPain.toFixed(1)}/10`,
        raw: currentAvgPain,
        ...painStats,
      },
      walking: {
        value: `${totalWalks} walk${totalWalks === 1 ? '' : 's'}`,
        raw: totalWalks,
        ...walkingStats,
      },
      strength: {
        value: `${totalWorkouts} / ${expectedWorkouts}`,
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
        raw: currentAvgReflux,
        ...refluxStats,
      },
      sittingBreaks: {
        value: `${currentAvgSittingActual.toFixed(1)} / ${currentAvgSittingTarget.toFixed(1)}`,
        raw: currentAvgSittingActual,
        ...sittingBreaksStats,
      },
    },
    chartData,
  };
}
