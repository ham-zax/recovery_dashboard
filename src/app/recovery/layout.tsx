import Link from 'next/link';
import { ProtocolBanner } from '@/components/ProtocolBanner';

const navItems = [
  { href: '/recovery', label: 'Dashboard', icon: '◎' },
  { href: '/recovery/checkin', label: 'Check-In', icon: '✦' },
  { href: '/recovery/workout', label: 'Workout', icon: '◆' },
  { href: '/recovery/review', label: 'Weekly Review', icon: '▣' },
  { href: '/recovery/settings', label: 'Settings', icon: '⚙' },
];

export default function RecoveryLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-bg-card flex flex-col">
        <div className="p-5 border-b border-border">
          <h1 className="text-base font-semibold text-text-primary tracking-tight">
            Recovery
          </h1>
          <p className="text-xs text-text-tertiary mt-0.5 font-mono">
            Personal Operating System
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 text-sm text-text-secondary rounded-lg hover:bg-bg-card-hover hover:text-text-primary transition-colors"
            >
              <span className="text-base opacity-60">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <p className="text-[10px] text-text-tertiary font-mono leading-relaxed">
            &quot;The purpose of this app is not to find the perfect protocol. The purpose is to execute one protocol consistently for 12 weeks.&quot;
          </p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        <ProtocolBanner />
        <div className="flex-1 p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
