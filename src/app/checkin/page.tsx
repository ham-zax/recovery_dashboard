import { prisma } from '@/lib/prisma';
import { CheckInForm } from '@/components/CheckInForm';
import { startOfDayUtc, formatUtc } from '@/lib/validation';
import Link from 'next/link';
import { DateRedirect } from '@/components/DateRedirect';

export const dynamic = 'force-dynamic';

export default async function CheckInPage(props: { searchParams: Promise<{ date?: string }> }) {
  const searchParams = await props.searchParams;
  
  if (!searchParams.date) {
    return <DateRedirect />;
  }

  const targetDate = startOfDayUtc(searchParams.date);

  if (isNaN(targetDate.getTime())) {
    return <DateRedirect />;
  }

  // Fetch data in parallel to avoid sequential network waterfalls
  const [targetCheckIn, previousLogs, activeProtocol] = await Promise.all([
    prisma.dailyLog.findUnique({
      where: { date: targetDate },
    }),
    prisma.dailyLog.findMany({
      where: { date: { lt: targetDate } },
      orderBy: { date: 'desc' },
      take: 3,
    }),
    prisma.protocol.findFirst({
      where: { active: true },
      select: { sittingTarget: true }
    })
  ]);

  const sittingBreaksTarget = activeProtocol?.sittingTarget || 10;

  // Prepare initial data if today's check-in exists
  const initialData = targetCheckIn
    ? {
        pain: targetCheckIn.pain,
        reflux: targetCheckIn.reflux,
        walkedToday: targetCheckIn.walkedToday,
        strengthToday: targetCheckIn.strengthToday,
        sleepHours: targetCheckIn.sleepHours,
        sittingBreaksActual: targetCheckIn.sittingBreaksActual,
        notes: targetCheckIn.notes,
      }
    : null;

  const dateStr = formatUtc(targetDate, 'yyyy-MM-dd');

  return (
    <div className="max-w-md mx-auto px-4 pb-24 pt-4">
      {/* Page Title */}
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-tight text-text-primary leading-tight">
          Daily Check-In
        </h2>
        <p className="text-text-secondary text-[17px] mt-1 font-medium">
          {formatUtc(targetDate, 'EEEE, MMMM d')}
        </p>
      </div>

      <div className="space-y-8">
        <CheckInForm
          initialData={initialData}
          sittingBreaksTarget={sittingBreaksTarget}
          dateStr={dateStr}
        />

        {/* Previous 3 days card */}
        <div className="pt-4">
          <h3 className="text-[17px] font-semibold text-text-primary mb-3 pl-1">Recent</h3>
          <div className="bg-bg-card rounded-2xl border border-border overflow-hidden">
            {previousLogs.length === 0 ? (
              <p className="text-text-secondary text-[15px] p-4 text-center">No entries for previous days.</p>
            ) : (
              <div className="divide-y divide-border">
                {previousLogs.map((log) => {
                  const formattedDate = formatUtc(log.date, 'MMM d');
                  const logDateStr = formatUtc(log.date, 'yyyy-MM-dd');
                  
                  return (
                    <Link href={`/checkin?date=${logDateStr}`} key={log.id} className="p-4 block hover:bg-bg-card-hover transition-colors">
                      <div className="flex justify-between items-center">
                        <span className="text-text-primary font-medium">{formattedDate}</span>
                        <div className="text-text-secondary text-[15px] flex items-center gap-1.5">
                          <span>Pain {log.pain}</span>
                          <span className="text-text-tertiary">·</span>
                          <span>{log.sleepHours}h</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
