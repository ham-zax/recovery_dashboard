type Trend = 'up' | 'down' | 'same' | null;

export function generateTrendInsight(painTrend: Trend, walkingTrend: Trend): string {
  if (painTrend === 'down' && walkingTrend === 'up') {
    return 'Pain is decreasing as walking consistency improves.';
  }
  if (painTrend === 'down' && walkingTrend === 'same') {
    return 'Pain is decreasing with steady activity levels.';
  }
  if (painTrend === 'down' && walkingTrend === 'down') {
    return 'Pain is decreasing despite lower activity levels.';
  }
  if (painTrend === 'up' && walkingTrend === 'up') {
    return 'Pain has increased alongside higher activity levels. Monitor intensity.';
  }
  if (painTrend === 'up' && walkingTrend === 'down') {
    return 'Pain has increased as walking consistency dropped.';
  }
  if (painTrend === 'up' && walkingTrend === 'same') {
    return 'Pain has increased despite steady activity levels.';
  }
  if (painTrend === 'same') {
    return 'Pain levels remain stable across the period.';
  }
  return 'Recent pain and activity trends.';
}

export function generateComplianceInsight(complianceTrend: Trend, complianceValue: number): string {
  if (complianceValue >= 85) {
    if (complianceTrend === 'up') return 'Protocol adherence is excellent. Recovery trends can be interpreted confidently.';
    if (complianceTrend === 'down') return 'Protocol adherence remains high. Ensure consistency to maintain reliable data.';
    return 'Protocol adherence remains high. Recovery trends can be interpreted confidently.';
  }
  
  if (complianceValue >= 60) {
    if (complianceTrend === 'up') return 'Protocol adherence is recovering well, improving data reliability.';
    if (complianceTrend === 'down') return 'Protocol adherence is slipping. Focus on consistency to ensure the protocol works.';
    return 'Protocol adherence is moderate. More consistency will yield better recovery signals.';
  }

  if (complianceTrend === 'up') return 'Protocol adherence is low but improving. Keep building the habit.';
  return 'Protocol adherence needs attention. The current data may not reflect your true recovery capacity.';
}
