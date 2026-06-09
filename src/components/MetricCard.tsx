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

  // Determine trend icon and color
  let TrendIcon = Minus;
  let trendColorClass = 'text-text-tertiary';

  if (trend === 'up') {
    TrendIcon = TrendingUp;
    trendColorClass = isLowerBetter ? 'text-accent-red' : 'text-accent-green';
  } else if (trend === 'down') {
    TrendIcon = TrendingDown;
    trendColorClass = isLowerBetter ? 'text-accent-green' : 'text-accent-red';
  }

  // Subtle accent dot color
  const dotColor: Record<string, string> = {
    'accent-red': 'bg-accent-red',
    'accent-amber': 'bg-accent-amber',
    'accent-blue': 'bg-accent-blue',
    'accent-green': 'bg-accent-green',
    'accent-purple': 'bg-accent-purple',
  };

  return (
    <div className="bg-bg-card rounded-2xl p-4 min-h-[100px] flex flex-col justify-between transition-colors hover:bg-bg-card-hover cursor-default">
      {/* Label row with accent dot */}
      <div className="flex items-center gap-1.5">
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
        <div className="flex items-center gap-1 mt-2">
          <TrendIcon size={12} className={trendColorClass} strokeWidth={2.5} />
          <span className={`text-[11px] font-mono font-medium ${trendColorClass}`}>
            {delta}
          </span>
          <span className="text-[10px] text-text-tertiary ml-0.5">vs prev</span>
        </div>
      )}
    </div>
  );
}
