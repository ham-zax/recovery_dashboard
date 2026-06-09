'use client';

import React from 'react';

interface SegmentedControlProps {
  options: { label: string; value: string | number }[];
  value: string | number;
  onChange: (value: string | number) => void;
  size?: 'sm' | 'md';
}

export function SegmentedControl({
  options,
  value,
  onChange,
  size = 'md',
}: SegmentedControlProps) {
  const heights = { sm: 'h-8', md: 'h-9' };
  const textSizes = { sm: 'text-[11px]', md: 'text-[13px]' };

  return (
    <div
      className={`inline-flex items-center bg-bg-card rounded-[10px] p-[3px] gap-[2px] ${heights[size]}`}
    >
      {options.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative px-3 rounded-[8px] h-full ${textSizes[size]} font-semibold tracking-tight transition-all cursor-pointer ${
              isActive
                ? 'bg-bg-elevated text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
