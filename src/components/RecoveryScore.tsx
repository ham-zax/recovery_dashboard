'use client';

import React from 'react';
import { RecoveryState } from '@/lib/score';

interface RecoveryScoreProps {
  state: RecoveryState;
}

export function RecoveryScore({ state }: RecoveryScoreProps) {
  const radius = 54;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  
  const hasScore = state.score !== null;
  const clampedScore = hasScore ? Math.min(100, Math.max(0, state.score!)) : 0;
  const strokeDashoffset = hasScore ? circumference - (clampedScore / 100) * circumference : circumference;

  let scoreColor = 'stroke-border';
  let glowFilter = 'none';

  if (hasScore) {
    if (clampedScore >= 75) {
      scoreColor = 'stroke-accent-green';
      glowFilter = 'drop-shadow(0 0 5px rgba(52,211,153,0.4))';
    } else if (clampedScore >= 50) {
      scoreColor = 'stroke-accent-purple';
      glowFilter = 'drop-shadow(0 0 5px rgba(129,140,248,0.4))';
    } else {
      scoreColor = 'stroke-accent-red';
      glowFilter = 'drop-shadow(0 0 5px rgba(248,113,113,0.4))';
    }
  }

  return (
    <div className="linear-card rounded-xl p-5 flex flex-col items-center justify-center text-center h-full min-h-[220px]">
      <div className="relative flex items-center justify-center">
        <svg className="w-[140px] h-[140px] transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            className="stroke-border/20 fill-transparent"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            className={`${scoreColor} fill-transparent transition-all duration-700 ease-out`}
            style={{ filter: glowFilter }}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {/* Score text */}
        <div className="absolute flex flex-col items-center justify-center">
          {hasScore ? (
            <>
              <span className="text-[36px] font-extrabold text-text-primary font-mono leading-none tracking-tighter">
                {clampedScore}
              </span>
              <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider mt-1">
                Score
              </span>
            </>
          ) : (
            <span className="text-[14px] font-semibold text-text-secondary leading-tight text-center px-4">
              {state.status === 'Need Check-in' ? 'No Data' : 'Not Ready'}
            </span>
          )}
        </div>
      </div>
      <div className="mt-4 flex flex-col items-center">
        <h3 className="text-sm font-semibold text-text-primary">{state.status}</h3>
        <p className="text-[11px] text-text-secondary mt-1 max-w-[180px] leading-relaxed">
          {state.message}
        </p>
      </div>
    </div>
  );
}
