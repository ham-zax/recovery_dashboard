'use client';

import React, { forwardRef } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export const SelectTrigger = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={`flex items-center justify-between bg-bg-input border border-border rounded-lg px-3 py-2 text-[16px] md:text-sm text-text-primary focus:border-border-focus focus:ring-1 focus:ring-border-focus outline-none disabled:opacity-50 transition-colors ${className || ''}`}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50 ml-2" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

export const SelectContent = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = 'popper', ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={`relative z-50 min-w-[8rem] overflow-hidden rounded-xl border border-border bg-bg-elevated text-text-primary shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${
        position === 'popper'
          ? 'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1'
          : ''
      } ${className || ''}`}
      position={position}
      {...props}
    >
      <SelectPrimitive.ScrollUpButton className="flex cursor-default items-center justify-center py-1 bg-bg-elevated border-b border-border text-text-secondary">
        <ChevronUp className="h-4 w-4" />
      </SelectPrimitive.ScrollUpButton>
      <SelectPrimitive.Viewport
        className={`p-1 ${
          position === 'popper' &&
          'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]'
        }`}
      >
        {children}
      </SelectPrimitive.Viewport>
      <SelectPrimitive.ScrollDownButton className="flex cursor-default items-center justify-center py-1 bg-bg-elevated border-t border-border text-text-secondary">
        <ChevronDown className="h-4 w-4" />
      </SelectPrimitive.ScrollDownButton>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
));
SelectContent.displayName = SelectPrimitive.Content.displayName;

export const SelectLabel = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={`py-1.5 pl-8 pr-2 text-xs font-semibold text-text-secondary uppercase tracking-wider ${className || ''}`}
    {...props}
  />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

export const SelectItem = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={`relative flex w-full cursor-pointer select-none items-center rounded-md py-2 pl-8 pr-2 text-[16px] md:text-sm outline-none focus:bg-bg-card hover:bg-bg-card-hover data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors ${className || ''}`}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4 text-accent-purple" />
      </SelectPrimitive.ItemIndicator>
    </span>

    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

export const SelectSeparator = forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={`-mx-1 my-1 h-px bg-border ${className || ''}`}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
