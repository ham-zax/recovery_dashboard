'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from './Dialog';
import { Search, LayoutDashboard, ClipboardCheck, Dumbbell, BarChart3, Target, Settings } from 'lucide-react';

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPortal>
        <DialogOverlay className="bg-black/60 backdrop-blur-sm z-[100]" />
        <DialogContent className="z-[100] border-border bg-bg-card p-0 shadow-2xl max-w-xl overflow-hidden [&>button]:hidden sm:rounded-2xl">
          <Command
            className="w-full h-full flex flex-col bg-transparent text-text-primary"
            label="Global Command Menu"
          >
            <div className="flex items-center border-b border-border px-3" cmdk-input-wrapper="">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-text-secondary" />
              <Command.Input
                placeholder="Type a command or search..."
                className="flex h-14 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed disabled:opacity-50 border-none ring-0 focus:ring-0"
              />
              <button 
                onClick={() => setOpen(false)}
                className="ml-2 text-text-tertiary hover:text-text-primary transition-colors bg-bg-card-hover px-2 py-1 rounded border border-border shrink-0"
              >
                <span className="text-[10px] font-mono font-bold tracking-widest uppercase">ESC</span>
              </button>
            </div>
            <Command.List className="max-h-[350px] overflow-y-auto overflow-x-hidden p-2">
              <Command.Empty className="py-8 text-center text-sm text-text-secondary">
                No results found.
              </Command.Empty>
              <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
                <Command.Item 
                  onSelect={() => runCommand(() => {
                    const d = new Date();
                    const pad = (n: number) => n.toString().padStart(2, '0');
                    const localDateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
                    router.push(`/checkin?date=${localDateStr}`);
                  })}
                  className="relative flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm outline-none aria-selected:bg-bg-card-hover aria-selected:text-text-primary transition-colors"
                >
                  <ClipboardCheck className="mr-3 h-4 w-4 text-accent-purple" />
                  <span className="font-medium">Log Daily Check-In</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push('/workout'))}
                  className="relative flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm outline-none aria-selected:bg-bg-card-hover aria-selected:text-text-primary transition-colors"
                >
                  <Dumbbell className="mr-3 h-4 w-4 text-accent-blue" />
                  <span className="font-medium">Log Workout</span>
                </Command.Item>
              </Command.Group>
              <Command.Separator className="h-px bg-border/50 my-2 mx-2" />
              <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-text-tertiary [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
                <Command.Item 
                  onSelect={() => runCommand(() => router.push('/'))}
                  className="relative flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm outline-none aria-selected:bg-bg-card-hover aria-selected:text-text-primary transition-colors"
                >
                  <LayoutDashboard className="mr-3 h-4 w-4 text-text-secondary" />
                  <span className="font-medium">Dashboard</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push('/review'))}
                  className="relative flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm outline-none aria-selected:bg-bg-card-hover aria-selected:text-text-primary transition-colors"
                >
                  <BarChart3 className="mr-3 h-4 w-4 text-text-secondary" />
                  <span className="font-medium">Weekly Review</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push('/protocols'))}
                  className="relative flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm outline-none aria-selected:bg-bg-card-hover aria-selected:text-text-primary transition-colors"
                >
                  <Target className="mr-3 h-4 w-4 text-text-secondary" />
                  <span className="font-medium">Protocols</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push('/settings'))}
                  className="relative flex cursor-pointer select-none items-center rounded-xl px-3 py-3 text-sm outline-none aria-selected:bg-bg-card-hover aria-selected:text-text-primary transition-colors"
                >
                  <Settings className="mr-3 h-4 w-4 text-text-secondary" />
                  <span className="font-medium">Settings</span>
                </Command.Item>
              </Command.Group>
            </Command.List>
          </Command>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
