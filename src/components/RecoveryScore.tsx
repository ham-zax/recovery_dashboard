'use client';

import React, { useEffect, useState, useId } from 'react';
import { RecoveryState } from '@/lib/score';
import { Tooltip } from '@/components/ui/Tooltip';
import { Info } from 'lucide-react';

interface RecoveryScoreProps {
  state: RecoveryState;
}

export function RecoveryScore({ state }: RecoveryScoreProps) {
  const gradientId = useId();
  const hasScore = state.score !== null;
  const clampedScore = hasScore ? Math.min(100, Math.max(0, state.score!)) : 0;

  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    // Reset to 0 first so the animation reliably triggers
    setAnimatedScore(0);
    
    // Slight delay so the animation feels intentional after load
    const timer = setTimeout(() => {
      setAnimatedScore(clampedScore);
    }, 50);
    return () => clearTimeout(timer);
  }, [clampedScore]);

  // SVG parameters
  const size = 200;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  const glowClass = hasScore ? 'shadow-[0_0_60px_rgba(138,141,240,0.15)]' : '';

  return (
    <div className="flex flex-col items-center justify-center text-center w-full py-12 sm:py-20">
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
        <div className="relative group cursor-help flex items-center justify-center">
          {hasScore ? (
            <div className={`relative flex items-center justify-center w-[200px] h-[200px] rounded-full transition-all duration-500 ${glowClass}`}>
              
              {/* Background Track */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.03)"
                  strokeWidth={strokeWidth}
                />
                
                {/* Gradient Definition */}
                <defs>
                  <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-accent-purple)" />
                    <stop offset="100%" stopColor="var(--color-accent-blue)" />
                  </linearGradient>
                </defs>

                {/* Animated Progress Ring */}
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={`url(#${gradientId})`}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-[1500ms] ease-out"
                />
              </svg>

              <span className="relative z-10 text-hero-score text-text-primary block transition-transform duration-300 group-hover:scale-105">
                {clampedScore}
              </span>
              
              <div className="absolute top-6 right-6 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity z-20">
                <Info size={16} />
              </div>
            </div>
          ) : (
            <div className="relative flex items-center justify-center w-[200px] h-[200px] rounded-full">
              <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${size} ${size}`}>
                <circle
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke="rgba(255,255,255,0.03)"
                  strokeWidth={strokeWidth}
                  strokeDasharray="4 8"
                />
              </svg>
              <span className="text-hero-score text-text-secondary opacity-50 block">
                --
              </span>
              <div className="absolute top-6 right-6 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity z-20">
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
