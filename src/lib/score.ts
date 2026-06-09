export interface ScoreWeights {
  pain: number;
  reflux: number;
  walking: number;
  compliance: number;
  strength: number;
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  pain: 25,
  reflux: 15,
  walking: 25,
  compliance: 15, // sitting breaks
  strength: 20
};

export function validateWeights(weights: unknown): ScoreWeights {
  if (!weights || typeof weights !== 'object') return DEFAULT_WEIGHTS;
  
  const isValid = (val: unknown) => typeof val === 'number' && !isNaN(val) && val >= 0;
  
  const w = weights as Record<string, unknown>;

  if (
    isValid(w.pain) &&
    isValid(w.reflux) &&
    isValid(w.walking) &&
    isValid(w.compliance) &&
    isValid(w.strength)
  ) {
    const pain = w.pain as number;
    const reflux = w.reflux as number;
    const walking = w.walking as number;
    const compliance = w.compliance as number;
    const strength = w.strength as number;

    const total = pain + reflux + walking + compliance + strength;
    if (total > 0) {
      return { pain, reflux, walking, compliance, strength };
    }
  }
  
  return DEFAULT_WEIGHTS;
}

export type RecoveryStatus = 'Ready' | 'Recovering' | 'Needs Attention' | 'Need Check-in' | 'Insufficient Data';

export interface RecoveryState {
  score: number | null;
  status: RecoveryStatus;
  message: string;
}

export interface DailyMetrics {
  pain: number;
  reflux: number;
  walkedToday: boolean;
  sittingBreaksTarget: number;
  sittingBreaksActual: number;
}

export function calculateDailyRecovery(
  log: DailyMetrics | null,
  strengthScheduled: boolean,
  strengthCompleted: boolean,
  weights: ScoreWeights = DEFAULT_WEIGHTS
): RecoveryState {
  if (!log) {
    return {
      score: null,
      status: 'Need Check-in',
      message: "Log today's data to see your score"
    };
  }

  // Component calculations (0-100)
  // Pain/Reflux: 0 is best (100%), 10 is worst (0%)
  const painScore = Math.max(0, 100 - (log.pain * 10));
  const refluxScore = Math.max(0, 100 - (log.reflux * 10));
  const walkScore = log.walkedToday ? 100 : 0;
  
  const target = log.sittingBreaksTarget > 0 ? log.sittingBreaksTarget : 10;
  const complianceScore = Math.min(100, (log.sittingBreaksActual / target) * 100);

  const activeWeights = { ...weights };
  let strengthScore = 0;

  if (strengthScheduled) {
    strengthScore = strengthCompleted ? 100 : 0;
  } else {
    // Rest day: redistribute strength weight to other metrics
    const remainingWeight = activeWeights.pain + activeWeights.reflux + activeWeights.walking + activeWeights.compliance;
    if (remainingWeight > 0) {
      const multiplier = 1 + (activeWeights.strength / remainingWeight);
      activeWeights.pain *= multiplier;
      activeWeights.reflux *= multiplier;
      activeWeights.walking *= multiplier;
      activeWeights.compliance *= multiplier;
    }
    activeWeights.strength = 0;
  }

  // Total raw score
  const totalWeight = activeWeights.pain + activeWeights.reflux + activeWeights.walking + activeWeights.compliance + activeWeights.strength;
  
  // Guard against 0 total weight
  if (totalWeight === 0) {
    return {
      score: null,
      status: 'Insufficient Data',
      message: 'Invalid weight configuration'
    };
  }

  const raw = (
    painScore * activeWeights.pain +
    refluxScore * activeWeights.reflux +
    walkScore * activeWeights.walking +
    complianceScore * activeWeights.compliance +
    strengthScore * activeWeights.strength
  ) / totalWeight; // Divide by actual total weight in case it doesn't sum to 100 exactly

  const score = Math.min(100, Math.max(0, Math.round(raw)));

  let status: RecoveryStatus = 'Ready';
  let message = 'Ready for training';

  if (score < 50) {
    status = 'Needs Attention';
    message = 'Prioritize rest and recovery';
  } else if (score < 75) {
    status = 'Recovering';
    message = 'Moderate activity recommended';
  }

  return { score, status, message };
}
