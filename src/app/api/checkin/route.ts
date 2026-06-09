import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { subDays } from 'date-fns';
import { getActiveProtocol } from '@/lib/protocol';
import { startOfDayUtc } from '@/lib/validation';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') ?? '7');
    const date = searchParams.get('date');

    if (date) {
      // Get single day
      const log = await prisma.dailyLog.findUnique({
        where: { date: startOfDayUtc(date) },
      });
      return Response.json(log);
    }

    // Get last N days
    const logs = await prisma.dailyLog.findMany({
      where: {
        date: { gte: subDays(startOfDayUtc(new Date()), days) },
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

    const pain = parseInt(body.pain);
    const reflux = parseInt(body.reflux);
    if (isNaN(pain) || pain < 0 || pain > 10) return Response.json({ error: 'Pain must be 0-10' }, { status: 400 });
    if (isNaN(reflux) || reflux < 0 || reflux > 10) return Response.json({ error: 'Reflux must be 0-10' }, { status: 400 });

    const sleepHours = parseFloat(body.sleepHours ?? 0);
    if (isNaN(sleepHours) || sleepHours < 0 || sleepHours > 24) return Response.json({ error: 'Sleep must be 0-24' }, { status: 400 });

    const sittingBreaksActual = parseInt(body.sittingBreaksActual ?? 0);
    if (isNaN(sittingBreaksActual) || sittingBreaksActual < 0) return Response.json({ error: 'Breaks must be non-negative' }, { status: 400 });


    const date = startOfDayUtc(body.date ?? new Date());
    const protocol = await getActiveProtocol();

    const log = await prisma.dailyLog.upsert({
      where: { date },
      update: {
        pain,
        reflux,
        walkedToday: !!body.walkedToday,
        strengthToday: !!body.strengthToday,
        sleepHours,
        sittingBreaksActual,
        notes: body.notes ?? null,
        protocolId: protocol.id,
      },
      create: {
        date,
        pain,
        reflux,
        walkedToday: !!body.walkedToday,
        strengthToday: !!body.strengthToday,
        sleepHours,
        sittingBreaksActual,
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
