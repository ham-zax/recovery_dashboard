'use client';

import React from 'react';
import * as RadioGroup from '@radix-ui/react-radio-group';

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
  const heights = { sm: 'min-h-[36px] sm:min-h-[32px]', md: 'min-h-[44px] sm:min-h-[36px]' };
  const textSizes = { sm: 'text-[13px] sm:text-[11px]', md: 'text-[15px] sm:text-[13px]' };

  return (
    <RadioGroup.Root
      value={String(value)}
      onValueChange={(val) => {
        const originalOpt = options.find(o => String(o.value) === val);
        if (originalOpt) onChange(originalOpt.value);
      }}
      className={`inline-flex items-center bg-bg-card rounded-[10px] p-[3px] gap-[2px] ${heights[size]}`}
      orientation="horizontal"
    >
      {options.map((opt) => (
        <RadioGroup.Item
          key={opt.value}
          value={String(opt.value)}
          className={`relative px-3 rounded-[8px] h-full ${textSizes[size]} font-semibold tracking-tight transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-accent-purple focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary data-[state=checked]:bg-bg-elevated data-[state=checked]:text-text-primary data-[state=checked]:shadow-sm data-[state=unchecked]:text-text-secondary data-[state=unchecked]:hover:text-text-primary`}
        >
          {opt.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
