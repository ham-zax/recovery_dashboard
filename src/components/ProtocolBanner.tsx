import { prisma } from '@/lib/prisma';
import { differenceInDays } from 'date-fns';
import { Lock, Unlock, TrendingUp } from 'lucide-react';

export async function ProtocolBanner() {
  const lock = await prisma.protocolLock.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  const startDateSetting = await prisma.setting.findUnique({
    where: { key: 'protocol_start_date' },
  });

  const durationSetting = await prisma.setting.findUnique({
    where: { key: 'protocol_duration_days' },
  });

  const totalDays = durationSetting ? parseInt(durationSetting.value) : 84;
  const startDate = startDateSetting
    ? new Date(startDateSetting.value)
    : new Date();
  const today = new Date();
  const dayNumber = Math.max(1, differenceInDays(today, startDate) + 1);
  const weeksRemaining = Math.max(
    0,
    Math.ceil((totalDays - dayNumber) / 7)
  );

  const isLocked = lock ? new Date(lock.lockedUntil) > today : false;
  const lockDateStr = lock
    ? new Date(lock.lockedUntil).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : 'Not set';

  // Compute overall compliance
  const totalLogs = await prisma.dailyLog.count();
  const daysElapsed = Math.max(1, dayNumber);
  const compliancePercent = Math.round((totalLogs / daysElapsed) * 100);

  const progressPercent = Math.min(100, Math.round((dayNumber / totalDays) * 100));

  return (
    <div className="border-b border-border/30 bg-bg-card/50">
      <div className="px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-5 text-[13px]">
          {/* Protocol version + lock */}
          <div className="flex items-center gap-1.5">
            {isLocked ? (
              <Lock size={13} className="text-accent-red" />
            ) : (
              <Unlock size={13} className="text-text-tertiary" />
            )}
            <span className="font-mono font-semibold text-text-primary">
              {lock?.version ?? 'v1.0'}
            </span>
            {isLocked && (
              <span className="text-[11px] text-text-tertiary font-mono ml-1">
                until {lockDateStr}
              </span>
            )}
          </div>

          <div className="w-px h-4 bg-border/50" />

          {/* Day counter */}
          <div className="font-mono">
            <span className="text-accent-purple font-semibold">Day {dayNumber}</span>
            <span className="text-text-tertiary"> / {totalDays}</span>
          </div>

          <div className="w-px h-4 bg-border/50" />

          {/* Weeks remaining */}
          <span className="font-mono text-text-secondary">
            {weeksRemaining}w left
          </span>

          <div className="w-px h-4 bg-border/50" />

          {/* Compliance */}
          <div className="flex items-center gap-1.5 font-mono">
            <TrendingUp size={13} className="text-text-tertiary" />
            <span
              className={
                compliancePercent >= 80
                  ? 'text-accent-green font-semibold'
                  : compliancePercent >= 60
                    ? 'text-accent-amber font-semibold'
                    : 'text-accent-red font-semibold'
              }
            >
              {compliancePercent}%
            </span>
          </div>
        </div>

        {/* Progress bar + motto */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:block w-24 h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-purple rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-[11px] text-text-tertiary font-mono italic hidden xl:block">
            Execution &gt; Explanation
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact protocol strip for mobile dashboard.
 * Shows essential info in a single row.
 */
export async function ProtocolStrip() {
  const lock = await prisma.protocolLock.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  const startDateSetting = await prisma.setting.findUnique({
    where: { key: 'protocol_start_date' },
  });

  const durationSetting = await prisma.setting.findUnique({
    where: { key: 'protocol_duration_days' },
  });

  const totalDays = durationSetting ? parseInt(durationSetting.value) : 84;
  const startDate = startDateSetting
    ? new Date(startDateSetting.value)
    : new Date();
  const today = new Date();
  const dayNumber = Math.max(1, differenceInDays(today, startDate) + 1);

  const isLocked = lock ? new Date(lock.lockedUntil) > today : false;

  // Compute compliance
  const totalLogs = await prisma.dailyLog.count();
  const daysElapsed = Math.max(1, dayNumber);
  const compliancePercent = Math.round((totalLogs / daysElapsed) * 100);

  const progressPercent = Math.min(100, Math.round((dayNumber / totalDays) * 100));

  return (
    <div className="bg-bg-card rounded-2xl p-4 space-y-3">
      {/* Top row: version + day count + compliance */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-mono">
          {isLocked && <Lock size={12} className="text-accent-red" />}
          <span className="font-semibold text-text-primary">{lock?.version ?? 'v1.0'}</span>
          <span className="text-text-tertiary">·</span>
          <span className="text-accent-purple font-semibold">Day {dayNumber}</span>
          <span className="text-text-tertiary">/ {totalDays}</span>
        </div>
        <span
          className={`text-[13px] font-mono font-semibold ${
            compliancePercent >= 80
              ? 'text-accent-green'
              : compliancePercent >= 60
                ? 'text-accent-amber'
                : 'text-accent-red'
          }`}
        >
          {compliancePercent}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-border/50 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-purple rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
