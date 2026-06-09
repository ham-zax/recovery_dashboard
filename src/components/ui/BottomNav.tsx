'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardCheck,
  Dumbbell,
  BarChart3,
  Settings,
  Target,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/checkin', label: 'Check-In', icon: ClipboardCheck },
  { href: '/workout', label: 'Workout', icon: Dumbbell },
  { href: '/review', label: 'Review', icon: BarChart3 },
  { href: '/protocols', label: 'Protocols', icon: Target },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      id="bottom-nav"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
    >
      {/* Frosted glass background */}
      <div className="backdrop-blur-xl bg-bg-card/80 border-t border-border/50 pb-safe">
        <div className="flex items-center justify-around h-[60px] px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href);

            const active = isActive;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] rounded-xl transition-colors ${
                  active
                    ? 'text-accent-purple'
                    : 'text-text-tertiary active:text-text-secondary'
                }`}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.2 : 1.5}
                />
                <span className="text-[10px] font-medium leading-none">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
