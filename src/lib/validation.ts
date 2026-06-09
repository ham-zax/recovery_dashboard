export function clampNumber(value: number, min?: number, max?: number): number {
  let result = value;
  if (min !== undefined && result < min) result = min;
  if (max !== undefined && result > max) result = max;
  return result;
}

export function parseBoundedInt(value: string | number | undefined | null, min?: number, max?: number, fallback: number | null = null): number | null {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(parsed)) return fallback;
  return clampNumber(parsed, min, max);
}

export function parseBoundedFloat(value: string | number | undefined | null, min?: number, max?: number, fallback: number | null = null): number | null {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(parsed)) return fallback;
  return clampNumber(parsed, min, max);
}
