import { prisma } from '@/lib/prisma';
import { WorkoutForm } from '@/components/WorkoutForm';
import { SetData } from '@/components/ExerciseCard';

export const dynamic = 'force-dynamic';

export default async function WorkoutPage() {
  // Fetch active exercises from DB
  const exercises = await prisma.exercise.findMany({
    where: { active: true },
    orderBy: { sortOrder: 'asc' },
  });

  const lastSessions: Record<number, SetData[]> = {};

  // For each exercise, retrieve the sets logged during the most recent workout session
  for (const ex of exercises) {
    const lastEntry = await prisma.exerciseEntry.findFirst({
      where: { exerciseId: ex.id },
      orderBy: { session: { date: 'desc' } },
      select: { sessionId: true },
    });

    if (lastEntry) {
      const entries = await prisma.exerciseEntry.findMany({
        where: {
          exerciseId: ex.id,
          sessionId: lastEntry.sessionId,
        },
        orderBy: { setNumber: 'asc' },
        select: {
          weight: true,
          reps: true,
          rpe: true,
        },
      });
      lastSessions[ex.id] = entries;
    } else {
      lastSessions[ex.id] = [];
    }
  }

  // Fetch the workout schedule setting
  const scheduleSetting = await prisma.setting.findUnique({
    where: { key: 'workout_schedule' },
  });

  let schedule: Record<string, string> = {
    mon: 'REST',
    tue: 'REST',
    wed: 'REST',
    thu: 'REST',
    fri: 'REST',
    sat: 'REST',
    sun: 'REST',
  };

  if (scheduleSetting) {
    try {
      schedule = JSON.parse(scheduleSetting.value);
    } catch (e) {
      console.error('Error parsing workout_schedule setting:', e);
    }
  }

  // Map JS Date days (0-6) to setting keys (sun-sat)
  const daysOfWeek = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayDayName = daysOfWeek[new Date().getDay()];
  const todaySchedule = schedule[todayDayName] || 'REST';

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header and schedule status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary font-mono">Workout Logger</h2>
          <p className="text-text-secondary text-sm mt-1">
            Today: <span className="text-text-primary font-semibold">{todayFormatted}</span>
          </p>
        </div>
        <div className="flex items-center gap-3 bg-bg-card border border-border px-4 py-2 rounded-xl text-sm font-mono">
          <span className="text-text-tertiary">Today&apos;s Schedule:</span>
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
            todaySchedule === 'REST'
              ? 'bg-text-tertiary/10 text-text-secondary border border-text-tertiary/20'
              : todaySchedule === 'LOWER'
                ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                : 'bg-accent-purple/10 text-accent-purple border border-accent-purple/20'
          }`}>
            {todaySchedule}
          </span>
        </div>
      </div>

      {/* Mini Weekly Schedule */}
      <div className="bg-bg-card rounded-xl border border-border p-4">
        <h4 className="text-xs font-mono uppercase tracking-wider text-text-tertiary mb-3">Weekly Schedule</h4>
        <div className="flex overflow-x-auto snap-x gap-2 pb-2 md:grid md:grid-cols-7 text-center text-xs font-mono -mx-4 px-4 md:mx-0 md:px-0 hide-scrollbar">
          {Object.entries(schedule).map(([day, type]) => {
            const isToday = day === todayDayName;
            return (
              <div 
                key={day} 
                className={`min-w-[64px] flex-shrink-0 snap-start p-2 rounded-lg border ${
                  isToday 
                    ? 'border-accent-blue bg-accent-blue/5 shadow-sm' 
                    : 'border-border/60 bg-bg-primary'
                }`}
              >
                <div className={`font-semibold capitalize ${isToday ? 'text-accent-blue' : 'text-text-secondary'}`}>
                  {day}
                </div>
                <div className={`mt-1 text-[10px] ${
                  type === 'REST' 
                    ? 'text-text-tertiary' 
                    : type === 'LOWER' 
                      ? 'text-accent-blue font-medium' 
                      : 'text-accent-purple font-medium'
                }`}>
                  {type}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main workout logger form */}
      <div className="bg-bg-card rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-6">Log Workout Session</h3>
        <WorkoutForm 
          exercises={exercises} 
          lastSessions={lastSessions} 
        />
      </div>
    </div>
  );
}
