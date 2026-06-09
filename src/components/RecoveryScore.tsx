'use client';

import React from 'react';
import { RecoveryState } from '@/lib/score';

interface RecoveryScoreProps {
  state: RecoveryState;
}

export function RecoveryScore({ state }: RecoveryScoreProps) {
  const hasScore = state.score !== null;
  const clampedScore = hasScore ? Math.min(100, Math.max(0, state.score!)) : 0;

  // Semantic glow behind the text
  let glowClass = '';
  if (hasScore) {
    if (clampedScore >= 75) {
      glowClass = 'shadow-[0_0_80px_rgba(52,211,153,0.15)]';
    } else if (clampedScore >= 50) {
      glowClass = 'shadow-[0_0_80px_rgba(129,140,248,0.15)]';
    } else {
      glowClass = 'shadow-[0_0_80px_rgba(248,113,113,0.15)]';
    }
  }

  return (
    <div className="flex flex-col items-center justify-center text-center w-full py-16 sm:py-24">
      {hasScore ? (
        <div className={`relative flex items-center justify-center w-[180px] h-[180px] rounded-full border border-[rgba(255,255,255,0.05)] ${glowClass}`}>
          <span className="text-hero-score text-text-primary block">
            {clampedScore}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center w-[180px] h-[180px] rounded-full border border-[rgba(255,255,255,0.05)]">
          <span className="text-hero-score text-text-secondary opacity-50 block">
            --
          </span>
        </div>
      )}
      
      <div className="mt-8 flex flex-col items-center max-w-sm">
        <h2 className="text-hero-status text-text-primary tracking-widest uppercase">
          {state.status}
        </h2>
        
        {/* Narrative interpretation directly from the state machine */}
        <p className="mt-3 text-[15px] text-text-secondary leading-relaxed">
          {state.narrative}
        </p>
      </div>
    </div>
  );
}
