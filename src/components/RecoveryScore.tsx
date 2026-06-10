'use client';

import React from 'react';
import { RecoveryState } from '@/lib/score';

import { Tooltip } from '@/components/ui/Tooltip';
import { Info } from 'lucide-react';

interface RecoveryScoreProps {
  state: RecoveryState;
}

export function RecoveryScore({ state }: RecoveryScoreProps) {
  const hasScore = state.score !== null;
  const clampedScore = hasScore ? Math.min(100, Math.max(0, state.score!)) : 0;

  // Semantic glow behind the text
  const glowClass = hasScore ? 'shadow-[0_0_50px_rgba(138,141,240,0.10)]' : '';

  return (
    <div className="flex flex-col items-center justify-center text-center w-full py-16 sm:py-24">
      <Tooltip
        content={
          <div className="text-left space-y-2 p-1">
            <p className="font-semibold text-text-primary text-[13px]">How is this calculated?</p>
            <p className="text-text-tertiary text-xs leading-relaxed">
              Recovery Score combines pain, symptom stability, activity consistency, and protocol compliance over recent days.
            </p>
          </div>
        }
      >
        <div className="relative group cursor-help">
          {hasScore ? (
            <div className={`relative flex items-center justify-center w-[180px] h-[180px] rounded-full border border-[rgba(255,255,255,0.05)] transition-all duration-300 group-hover:border-[rgba(255,255,255,0.1)] ${glowClass}`}>
              <span className="text-hero-score text-text-primary block transition-transform duration-300 group-hover:scale-105">
                {clampedScore}
              </span>
              <div className="absolute top-4 right-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                <Info size={16} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center w-[180px] h-[180px] rounded-full border border-[rgba(255,255,255,0.05)] transition-all duration-300 group-hover:border-[rgba(255,255,255,0.1)]">
              <span className="text-hero-score text-text-secondary opacity-50 block">
                --
              </span>
              <div className="absolute top-4 right-4 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity">
                <Info size={16} />
              </div>
            </div>
          )}
        </div>
      </Tooltip>
      
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
