export function getPainState(val: number): string {
  if (val <= 3) return 'Low';
  if (val <= 6) return 'Moderate';
  return 'High';
}

export function getRefluxState(val: number): string {
  if (val <= 2) return 'Low';
  if (val <= 5) return 'Moderate';
  return 'High';
}

export function getStrengthState(workouts: number, expected: number): string {
  if (workouts >= expected && expected > 0) return 'Optimal';
  if (workouts > 0) return 'Partial';
  return 'None';
}
