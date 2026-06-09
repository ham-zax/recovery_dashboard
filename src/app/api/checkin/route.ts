import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { startOfDay, subDays } from 'date-fns';
import { getActiveProtocol } from '@/lib/protocol';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') ?? '7');
    const date = searchParams.get('date');

    if (date) {
      // Get single day
      const log = await prisma.dailyLog.findUnique({
        where: { date: startOfDay(new Date(date)) },
      });
      return Response.json(log);
    }

    // Get last N days
    const logs = await prisma.dailyLog.findMany({
      where: {
        date: { gte: startOfDay(subDays(new Date(), days)) },
      },
      orderBy: { date: 'desc' },
    });
    return Response.json(logs);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.pain === undefined || body.reflux === undefined) {
      return Response.json({ error: 'Pain and reflux metrics are required' }, { status: 400 });
    }

    const date = startOfDay(new Date(body.date ?? new Date()));
    const protocol = await getActiveProtocol();

    const log = await prisma.dailyLog.upsert({
      where: { date },
      update: {
        pain: parseInt(body.pain),
        reflux: parseInt(body.reflux),
        walkedToday: !!body.walkedToday,
        strengthToday: !!body.strengthToday,
        sleepHours: parseFloat(body.sleepHours ?? 0),
        sittingBreaksActual: parseInt(body.sittingBreaksActual ?? 0),
        notes: body.notes ?? null,
        protocolId: protocol.id,
      },
      create: {
        date,
        pain: parseInt(body.pain),
        reflux: parseInt(body.reflux),
        walkedToday: !!body.walkedToday,
        strengthToday: !!body.strengthToday,
        sleepHours: parseFloat(body.sleepHours ?? 0),
        sittingBreaksActual: parseInt(body.sittingBreaksActual ?? 0),
        notes: body.notes ?? null,
        protocolId: protocol.id,
      },
    });

    return Response.json(log, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return Response.json({ error: message }, { status: 500 });
  }
}
