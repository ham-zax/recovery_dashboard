import { startOfDay } from 'date-fns';
import { format } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { CheckInForm } from '@/components/CheckInForm';

export default async function CheckInPage() {
  const today = startOfDay(new Date());

  // Fetch today's check-in
  const todayCheckIn = await prisma.dailyLog.findUnique({
    where: { date: today },
  });

  // Fetch last 3 days of check-ins (before today)
  const previousLogs = await prisma.dailyLog.findMany({
    where: {
      date: {
        lt: today,
      },
    },
    orderBy: {
      date: 'desc',
    },
    take: 3,
  });

  // Fetch sitting_breaks_target setting
  const targetSetting = await prisma.setting.findUnique({
    where: { key: 'sitting_breaks_target' },
  });
  const sittingBreaksTarget = targetSetting ? parseInt(targetSetting.value, 10) : 10;

  // Prepare initial data if today's check-in exists
  const initialData = todayCheckIn
    ? {
        pain: todayCheckIn.pain,
        reflux: todayCheckIn.reflux,
        walkedToday: todayCheckIn.walkedToday,
        strengthToday: todayCheckIn.strengthToday,
        sleepHours: todayCheckIn.sleepHours,
        sittingBreaksActual: todayCheckIn.sittingBreaksActual,
        notes: todayCheckIn.notes,
      }
    : null;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Page Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-text-primary font-mono">Daily Check-In</h2>
        <p className="text-text-secondary text-sm mt-1">
          Log your metrics to track compliance and progress daily.
        </p>
      </div>

      {/* Main check-in card */}
      <div className="bg-bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center justify-between">
          <span>Today&apos;s Entry</span>
          {todayCheckIn && (
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-accent-green/10 text-accent-green border border-accent-green/20">
              Completed
            </span>
          )}
        </h3>

        <CheckInForm
          initialData={initialData}
          sittingBreaksTarget={sittingBreaksTarget}
        />
      </div>

      {/* Previous 3 days card */}
      <div className="bg-bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Previous 3 Days</h3>
        {previousLogs.length === 0 ? (
          <p className="text-text-secondary text-sm italic font-mono">No entries for previous days.</p>
        ) : (
          <div className="space-y-4">
            {previousLogs.map((log) => {
              const formattedDate = format(new Date(log.date), 'MMM d');
              
              const parts = [
                `Pain ${log.pain}`,
                `Sleep ${log.sleepHours}h`,
                `Breaks ${log.sittingBreaksActual}/${log.sittingBreaksTarget}`
              ];
              if (log.walkedToday) parts.push(`✓ Walk`);
              if (log.strengthToday) parts.push(`✓ Strength`);

              return (
                <div key={log.id} className="border-b border-border/50 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="text-text-secondary font-mono">
                      <span className="text-text-primary font-medium">{formattedDate}</span>: {parts.join(' · ')}
                    </div>
                  </div>
                  {log.notes && (
                    <div className="text-xs text-text-tertiary font-mono italic mt-1 pl-4 border-l border-border max-w-full truncate">
                      &ldquo;{log.notes}&rdquo;
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
