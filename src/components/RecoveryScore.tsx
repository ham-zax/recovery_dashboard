'use client';

import React from 'react';

interface RecoveryScoreProps {
  score: number;
}

export function RecoveryScore({ score }: RecoveryScoreProps) {
  const radius = 54;
  const strokeWidth = 7;
  const circumference = 2 * Math.PI * radius;
  const clampedScore = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  // Color based on score
  const scoreColor =
    clampedScore >= 80
      ? 'stroke-accent-green'
      : clampedScore >= 60
        ? 'stroke-accent-purple'
        : clampedScore >= 40
          ? 'stroke-accent-amber'
          : 'stroke-accent-red';

  return (
    <div className="bg-bg-card rounded-2xl p-5 flex flex-col items-center justify-center text-center">
      <div className="relative flex items-center justify-center">
        <svg className="w-[140px] h-[140px] transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            className="stroke-border/40 fill-transparent"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx="70"
            cy="70"
            r={radius}
            className={`${scoreColor} fill-transparent transition-all duration-700 ease-out`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        {/* Score text */}
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-[36px] font-extrabold text-text-primary font-mono leading-none tracking-tighter">
            {clampedScore}
          </span>
          <span className="text-[10px] text-text-tertiary font-medium uppercase tracking-wider mt-1">
            Score
          </span>
        </div>
      </div>
      <p className="text-[11px] text-text-secondary mt-3 max-w-[180px] leading-relaxed">
        Composite recovery score
      </p>
    </div>
  );
}
