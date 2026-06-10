'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

export function TooltipProvider(props: TooltipPrimitive.TooltipProviderProps) {
  return <TooltipPrimitive.Provider {...props} />;
}

export function Tooltip({
  children,
  content,
}: {
  children: React.ReactNode;
  content: React.ReactNode;
}) {
  return (
    <TooltipPrimitive.Root delayDuration={150}>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className="z-50 overflow-hidden rounded-[10px] bg-bg-card border border-border px-3 py-2 text-sm text-text-secondary shadow-[0_8px_30px_rgb(0,0,0,0.2)] max-w-[280px] text-center"
          sideOffset={8}
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
