import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { formatUtc } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const formatType = searchParams.get('format') ?? 'json';
    const dateStr = formatUtc(new Date(), 'yyyy-MM-dd');

    if (formatType === 'csv') {
      // Export Daily Logs as CSV
      const logs = await prisma.dailyLog.findMany({
        orderBy: { date: 'asc' },
        include: { protocol: true },
      });

      const csvHeaders = [
        'Date',
        'Pain (0-10)',
        'Reflux (0-10)',
        'Walked Today',
        'Strength Today',
        'Sleep Hours',
        'Sitting Breaks Actual',
        'Sitting Breaks Target',
        'Notes',
      ].join(',');

      const csvRows = logs.map(l => {
        const row = [
          formatUtc(l.date, 'yyyy-MM-dd'),
          l.pain,
          l.reflux,
          l.walkedToday ? 'Yes' : 'No',
          l.strengthToday ? 'Yes' : 'No',
          l.sleepHours,
          l.sittingBreaksActual,
          l.protocol.sittingTarget,
          l.notes ? `"${l.notes.replace(/"/g, '""')}"` : '',
        ];
        return row.join(',');
      });

      const csvContent = [csvHeaders, ...csvRows].join('\n');

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=recovery_daily_logs_${dateStr}.csv`,
        },
      });
    }

    // Export all data as JSON
    const logs = await prisma.dailyLog.findMany({ orderBy: { date: 'asc' } });
    const workouts = await prisma.workoutSession.findMany({
      include: {
        entries: {
          include: {
            exercise: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });
    const reviews = await prisma.weeklyReview.findMany({ orderBy: { weekStarting: 'asc' } });
    const locks = await prisma.protocolLock.findMany({ orderBy: { createdAt: 'asc' } });
    const settings = await prisma.setting.findMany();
    const exercises = await prisma.exercise.findMany({ orderBy: { sortOrder: 'asc' } });
    const protocols = await prisma.protocol.findMany({ orderBy: { createdAt: 'asc' } });
    const protocolChanges = await prisma.protocolChange.findMany({ orderBy: { changedAt: 'asc' } });

    const exportData = {
      exportedAt: new Date().toISOString(),
      dailyLogs: logs,
      workouts,
      weeklyReviews: reviews,
      protocolLocks: locks,
      settings,
      exercises,
      protocols,
      protocolChanges,
    };

    const jsonContent = JSON.stringify(exportData, null, 2);

    return new Response(jsonContent, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=recovery_data_export_${dateStr}.json`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
