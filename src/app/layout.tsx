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
} from 'lucide-react';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Recovery Dashboard',
  description: "Personal Recovery Operating System. Observe reality, don't create theories.",
};

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/checkin', label: 'Check-In', icon: ClipboardCheck },
  { href: '/workout', label: 'Workout', icon: Dumbbell },
  { href: '/review', label: 'Review', icon: BarChart3 },
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
      </body>
    </html>
  );
}
