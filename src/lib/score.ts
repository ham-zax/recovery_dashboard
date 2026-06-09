export interface ScoreWeights {
  walking: number;
  strength: number;
  sleep: number;
  sitting: number;
  checkins: number;
}

export interface WeekData {
  totalWalks: number;
  totalWorkouts: number;
  expectedWorkouts: number;
  avgSleep: number;
  avgSittingCompliance: number; // 0-1
  daysCheckedIn: number;
  totalDays: number;
}

export function computeRecoveryScore(weekData: WeekData, weights: ScoreWeights): number {
  const walkScore = (weekData.totalWalks / Math.max(1, weekData.totalDays)) * 100;
  const strengthScore = (weekData.totalWorkouts / Math.max(1, weekData.expectedWorkouts)) * 100;
  const sleepScore = Math.min((weekData.avgSleep / 8) * 100, 100);
  const sittingScore = weekData.avgSittingCompliance * 100;
  const checkinScore = (weekData.daysCheckedIn / Math.max(1, weekData.totalDays)) * 100;

  const raw = (
    walkScore * weights.walking +
    strengthScore * weights.strength +
    sleepScore * weights.sleep +
    sittingScore * weights.sitting +
    checkinScore * weights.checkins
  ) / 100;

  return Math.min(100, Math.max(0, Math.round(raw)));
}
