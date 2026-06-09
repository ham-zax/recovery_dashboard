import { prisma } from '@/lib/prisma';
import { differenceInDays } from 'date-fns';

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

  return (
    <div className="border-b border-border bg-bg-card">
      <div className="px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Protocol version + lock */}
          <div className="flex items-center gap-2">
            {isLocked && (
              <span className="text-accent-red text-sm">🚫</span>
            )}
            <span className="font-mono text-sm font-semibold text-text-primary">
              Protocol {lock?.version ?? 'v1.0'}
            </span>
            {isLocked && (
              <span className="text-xs text-text-tertiary font-mono">
                Locked until {lockDateStr}
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-border" />

          {/* Day counter */}
          <div className="font-mono text-sm">
            <span className="text-accent-purple font-semibold">Day {dayNumber}</span>
            <span className="text-text-tertiary"> / {totalDays}</span>
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-border" />

          {/* Weeks remaining */}
          <span className="font-mono text-sm text-text-secondary">
            {weeksRemaining} weeks left
          </span>

          {/* Divider */}
          <div className="w-px h-5 bg-border" />

          {/* Compliance */}
          <span className="font-mono text-sm">
            <span className="text-text-secondary">Compliance </span>
            <span className={compliancePercent >= 80 ? 'text-accent-green' : compliancePercent >= 60 ? 'text-accent-amber' : 'text-accent-red'}>
              {compliancePercent}%
            </span>
          </span>
        </div>

        {/* Motto */}
        <span className="font-mono text-xs text-text-tertiary italic">
          Execution &gt; Explanation
        </span>
      </div>
    </div>
  );
}
