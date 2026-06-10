'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import * as Popover from '@radix-ui/react-popover';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
}

export function DatePicker({ value, onChange, placeholder = 'Pick a date', className = '', disabled, minDate, maxDate }: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`flex items-center gap-2 h-[42px] px-3 w-full rounded-lg border border-border bg-bg-input text-sm text-text-primary transition-all hover:border-border-focus focus:outline-none focus:ring-2 focus:ring-accent-purple focus:ring-offset-2 focus:ring-offset-bg-primary disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        >
          <CalendarIcon className="w-4 h-4 text-text-secondary" />
          <span className="flex-1 text-left font-mono">
            {value ? format(value, 'MMM d, yyyy') : <span className="text-text-tertiary">{placeholder}</span>}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 bg-bg-elevated border border-border rounded-xl shadow-2xl p-3 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=closed]:zoom-out-95"
        >
          <DayPicker
            mode="single"
            selected={value}
            onSelect={(date) => {
              onChange?.(date);
              setOpen(false);
            }}
            disabled={[
              ...(minDate ? [{ before: minDate }] : []),
              ...(maxDate ? [{ after: maxDate }] : []),
            ]}
            showOutsideDays={true}
            className="font-mono text-sm"
          />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
