import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string | null;
  trend?: 'up' | 'down' | 'same' | null;
  accentColor?: string;
}

export function MetricCard({
  label,
  value,
  delta,
  trend,
  accentColor,
}: MetricCardProps) {
  const isLowerBetter = label.toLowerCase() === 'pain' || label.toLowerCase() === 'reflux';

  // Determine trend icon and color info
  let TrendIcon = Minus;
  let trendBadgeStyle = 'bg-border/10 border-border/30 text-text-tertiary';

  if (trend === 'up') {
    TrendIcon = TrendingUp;
    trendBadgeStyle = isLowerBetter
      ? 'bg-accent-red/5 border-accent-red/15 text-accent-red'
      : 'bg-accent-green/5 border-accent-green/15 text-accent-green';
  } else if (trend === 'down') {
    TrendIcon = TrendingDown;
    trendBadgeStyle = isLowerBetter
      ? 'bg-accent-green/5 border-accent-green/15 text-accent-green'
      : 'bg-accent-red/5 border-accent-red/15 text-accent-red';
  }

  // Subtle accent dot color (no glowing shadows to maintain a clean, stable UI)
  const dotColor: Record<string, string> = {
    'accent-red': 'bg-accent-red',
    'accent-amber': 'bg-accent-amber',
    'accent-blue': 'bg-accent-blue',
    'accent-green': 'bg-accent-green',
    'accent-purple': 'bg-accent-purple',
  };

  return (
    <div className="linear-card rounded-xl p-4 min-h-[105px] flex flex-col justify-between cursor-default">
      {/* Label row with accent dot */}
      <div className="flex items-center gap-2">
        {accentColor && (
          <div className={`w-1.5 h-1.5 rounded-full ${dotColor[accentColor] ?? ''}`} />
        )}
        <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
          {label}
        </span>
      </div>

      {/* Value */}
      <div className="text-[22px] font-bold text-text-primary font-mono tracking-tight mt-2">
        {value}
      </div>

      {/* Delta */}
      {trend && delta !== null && delta !== undefined && (
        <div className="flex items-center gap-1.5 mt-2">
          <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border text-[11px] font-mono font-semibold ${trendBadgeStyle}`}>
            <TrendIcon size={11} strokeWidth={2.5} />
            <span>{delta}</span>
          </div>
          <span className="text-[10px] text-text-tertiary">vs prev</span>
        </div>
      )}
    </div>
  );
}
