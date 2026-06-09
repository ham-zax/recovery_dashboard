'use client';

import React from 'react';

interface PeriodToggleProps {
  days: number;
  onChange: (days: number) => void;
}

export function PeriodToggle({ days, onChange }: PeriodToggleProps) {
  const periods = [
    { label: '7d', value: 7 },
    { label: '30d', value: 30 },
    { label: '90d', value: 90 },
  ];

  return (
    <div className="inline-flex bg-bg-card border border-border rounded-lg p-1 gap-1">
      {periods.map((p) => {
        const isActive = days === p.value;
        return (
          <button
            key={p.value}
            id={`period-toggle-${p.value}`}
            onClick={() => onChange(p.value)}
            className={`px-3 py-1 text-xs font-mono rounded-md transition-all cursor-pointer ${
              isActive
                ? 'bg-accent-purple text-bg-primary font-bold shadow-sm'
                : 'text-text-secondary hover:text-text-primary hover:bg-bg-card-hover'
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
