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

const navItems = [
  { href: '/recovery', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/recovery/checkin', label: 'Check-In', icon: ClipboardCheck },
  { href: '/recovery/workout', label: 'Workout', icon: Dumbbell },
  { href: '/recovery/review', label: 'Review', icon: BarChart3 },
  { href: '/recovery/settings', label: 'Settings', icon: Settings },
];

export default function RecoveryLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
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
        <div className="p-4 border-t border-border/30">
          <p className="text-[10px] text-text-tertiary leading-relaxed italic">
            &ldquo;Execute one protocol consistently for 12 weeks.&rdquo;
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen w-full">
        {/* Protocol banner — desktop only (mobile gets it inline) */}
        <div className="hidden md:block">
          <ProtocolBanner />
        </div>

        {/* Content area with bottom padding for mobile nav */}
        <div className="flex-1 px-4 py-5 md:px-8 md:py-6 pb-24 md:pb-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <BottomNav />
    </div>
  );
}
