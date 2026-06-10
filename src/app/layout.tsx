import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import Link from 'next/link';
import { BottomNav } from '@/components/ui/BottomNav';
import { ProtocolBanner } from '@/components/ProtocolBanner';
import {
  LayoutDashboard,
  ClipboardCheck,
  Dumbbell,
  BarChart3,
  Settings,
  Target,
} from 'lucide-react';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
});

import { TooltipProvider } from '@/components/ui/Tooltip';
import { CommandPalette } from '@/components/ui/CommandPalette';

export const metadata: Metadata = {
  title: 'Recovery Dashboard',
  description: "Personal Recovery Operating System. Observe reality, don't create theories.",
};

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/checkin', label: 'Check-In', icon: ClipboardCheck },
  { href: '/workout', label: 'Workout', icon: Dumbbell },
  { href: '/review', label: 'Review', icon: BarChart3 },
  { href: '/protocols', label: 'Protocols', icon: Target },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen bg-bg-primary text-text-primary font-sans antialiased">
        <TooltipProvider>
          <div className="flex min-h-screen">
            {/* Desktop Sidebar — hidden on mobile */}
            <aside className="hidden md:flex w-[220px] shrink-0 border-r border-border/50 bg-bg-card/50 flex-col">
              <div className="p-5 pb-4">
                <h1 className="text-[15px] font-semibold text-text-primary tracking-tight">
                  Recovery
                </h1>
                <p className="text-[11px] text-text-tertiary mt-0.5 font-mono">
                  Personal Operating System
                </p>
              </div>
              <nav className="flex-1 px-3 space-y-0.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      className="flex items-center gap-3 px-3 py-2.5 text-[13px] text-text-secondary rounded-[10px] hover:bg-bg-card-hover hover:text-text-primary transition-colors cursor-pointer"
                    >
                      <Icon size={18} strokeWidth={1.5} className="opacity-70" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="p-4 border-t border-border/30 space-y-2 mt-auto">
                <p className="text-[10px] text-text-secondary font-mono tracking-widest font-semibold uppercase mb-2">
                  Core Principles
                </p>
                <ul className="text-xs text-text-tertiary space-y-1.5 opacity-90">
                  <li>Execution &gt; Explanation</li>
                  <li>Movement &gt; Static Load</li>
                  <li>Capacity &gt; Correction</li>
                  <li>Consistency &gt; Intensity</li>
                  <li>Months &gt; Days</li>
                </ul>
                <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-between text-[11px] text-text-tertiary">
                  <span>Command Menu</span>
                  <kbd className="font-mono bg-bg-card border border-border px-1.5 py-0.5 rounded shadow-sm text-[10px]">⌘K</kbd>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 flex flex-col min-h-screen w-full">
              {/* Protocol banner — desktop only (mobile gets it inline) */}
              <div className="hidden md:block">
                <ProtocolBanner />
              </div>

              {/* Content area with bottom padding for mobile nav */}
              <div className="flex-1 px-4 py-5 md:px-8 md:py-6 pb-[max(6rem,env(safe-area-inset-bottom))] md:pb-6">
                {children}
              </div>
            </main>

            {/* Mobile Bottom Nav */}
            <BottomNav />
          </div>
          <Toaster 
            theme="dark" 
            position="top-center"
            toastOptions={{
              classNames: {
                toast: "bg-bg-elevated/70 backdrop-blur-2xl border border-[rgba(255,255,255,0.08)] text-text-primary rounded-2xl shadow-2xl py-3 px-4",
                title: "text-[15px] font-semibold tracking-tight",
                description: "text-[13px] text-text-secondary",
                success: "border-accent-green/30 bg-accent-green/5 text-accent-green",
                error: "border-accent-red/30 bg-accent-red/5 text-accent-red",
                warning: "border-accent-amber/30 bg-accent-amber/5 text-accent-amber",
                info: "border-accent-blue/30 bg-accent-blue/5 text-accent-blue",
              }
            }}
          />
          <CommandPalette />
        </TooltipProvider>
      </body>
    </html>
  );
}
