import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { parseProtocolChanges } from '@/lib/protocol';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedLimit = parseInt(searchParams.get('limit') || '50', 10);
    const limit = Math.min(Math.max(parsedLimit, 1), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const protocolChanges = await prisma.protocolChange.findMany({
      include: {
        fromProtocol: true,
        toProtocol: true,
      },
      orderBy: { changedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return NextResponse.json({ 
      timeline: protocolChanges.map(pc => {
        let parsedChanges = 'Configuration updated';
        try {
          const c = parseProtocolChanges(pc.changes);
          parsedChanges = Object.keys(c)
            .map(k => {
               if (k === 'action') return c[k];
               const val = c[k] as { from: unknown; to: unknown };
               return `${k}: ${JSON.stringify(val.from)} → ${JSON.stringify(val.to)}`;
            })
            .join(', ');
        } catch {}

        return {
          id: pc.id,
          date: pc.changedAt,
          fromVersion: pc.fromProtocol.version,
          toVersion: pc.toProtocol.version,
          reason: pc.reason,
          notes: pc.notes,
          changes: parsedChanges,
        };
      })
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
