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
    <div className="max-w-md mx-auto px-4 pb-24 pt-4">
      {/* Page Title */}
      <div className="mb-8">
        <h2 className="text-[28px] font-bold tracking-tight text-text-primary leading-tight">
          Daily Check-In
        </h2>
        <p className="text-text-secondary text-[17px] mt-1 font-medium">
          {format(new Date(), 'EEEE, MMMM d')}
        </p>
      </div>

      <div className="space-y-8">
        <CheckInForm
          initialData={initialData}
          sittingBreaksTarget={sittingBreaksTarget}
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
                  const formattedDate = format(new Date(log.date), 'MMM d');
                  
                  return (
                    <div key={log.id} className="p-4">
                      <div className="flex justify-between items-center">
                        <span className="text-text-primary font-medium">{formattedDate}</span>
                        <div className="text-text-secondary text-[15px] flex items-center gap-1.5">
                          <span>Pain {log.pain}</span>
                          <span className="text-text-tertiary">·</span>
                          <span>{log.sleepHours}h</span>
                        </div>
                      </div>
                    </div>
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
