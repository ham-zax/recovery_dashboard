import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { isProtocolLocked } from '@/lib/lock';
import { getActiveProtocol, updateActiveProtocol } from '@/lib/protocol';
import { format } from 'date-fns';

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    const protocol = await getActiveProtocol();

    const latestLock = await prisma.protocolLock.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      settings: settingsMap,
      protocol: {
        id: protocol.id,
        version: protocol.version,
        walkingTarget: protocol.walkingTarget,
        sittingTarget: protocol.sittingTarget,
        recoveryWeights: protocol.recoveryWeights ? JSON.parse(protocol.recoveryWeights) : undefined,
        workoutSchedule: protocol.workoutSchedule ? JSON.parse(protocol.workoutSchedule) : undefined,
        active: protocol.active,
      },
      protocolLock: latestLock ? {
        version: latestLock.version,
        lockedUntil: latestLock.lockedUntil.toISOString(),
        description: latestLock.description,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { settings, protocol, protocolLock } = body;

    const isLocked = await isProtocolLocked();

    if (protocol) {
      try {
        await updateActiveProtocol({
          sittingTarget: protocol.sittingTarget,
          walkingTarget: protocol.walkingTarget,
          recoveryWeights: protocol.recoveryWeights ? JSON.stringify(protocol.recoveryWeights) : undefined,
          workoutSchedule: protocol.workoutSchedule ? JSON.stringify(protocol.workoutSchedule) : undefined,
        }, protocol.changeReason, protocol.changeNotes);
      } catch (e) {
        return NextResponse.json({ error: (e as Error).message }, { status: 403 });
      }
    }

    if (settings) {
      const genericSettings: Record<string, string> = {};

      for (const [key, value] of Object.entries(settings)) {
        genericSettings[key] = String(value);
      }

      // If locked, prevent changes to legacy generic settings
      // Note: Protocol field mutations are now strictly enforced by updateActiveProtocol() above.
      if (isLocked) {
        const lockedKeys = [
          'workout_schedule',
          'protocol_start_date',
          'protocol_duration_days',
        ];

        const attemptedChanges = [];
        for (const key of lockedKeys) {
          if (key in genericSettings) {
            const existingSetting = await prisma.setting.findUnique({
              where: { key },
            });
            const existingValue = existingSetting ? existingSetting.value : '';
            const newValue = String(genericSettings[key]);
            if (existingValue !== newValue) {
              attemptedChanges.push(key);
            }
          }
        }
        
        if (attemptedChanges.length > 0) {
          const activeLock = await prisma.protocolLock.findFirst({
            where: {
              lockedUntil: {
                gt: new Date(),
              },
            },
            orderBy: { lockedUntil: 'desc' },
          });
          const formattedDate = activeLock
            ? new Date(activeLock.lockedUntil).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })
            : 'set date';
          return NextResponse.json({
            error: `Protocol is locked until ${formattedDate}. Cannot modify settings: ${attemptedChanges.join(', ')}.`,
          }, { status: 403 });
        }
      }

      for (const [key, value] of Object.entries(genericSettings)) {
        await prisma.setting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
    }

    // Save protocol lock if requested (only if not already locked in future, or extending)
    if (protocolLock) {
      const newLockDate = new Date(protocolLock.lockedUntil);
      
      const activeLock = await prisma.protocolLock.findFirst({
        where: {
          lockedUntil: {
            gt: new Date(),
          },
        },
        orderBy: { lockedUntil: 'desc' },
      });

      // If currently locked, verify we aren't bypassing lock controls (like making it shorter)
      if (activeLock && newLockDate < activeLock.lockedUntil) {
        return NextResponse.json({
          error: 'Cannot shorten an existing protocol lock date.',
        }, { status: 400 });
      }

      await prisma.protocolLock.create({
        data: {
          version: protocolLock.version ?? 'v1.0',
          lockedUntil: newLockDate,
          description: protocolLock.description ?? 'Execute one protocol consistently.',
        },
      });

      // Also upsert settings value
      await prisma.setting.upsert({
        where: { key: 'protocol_locked_until' },
        update: { value: format(newLockDate, 'yyyy-MM-dd') },
        create: { key: 'protocol_locked_until', value: format(newLockDate, 'yyyy-MM-dd') },
      });
      if (protocolLock.version) {
        await prisma.setting.upsert({
          where: { key: 'protocol_version' },
          update: { value: protocolLock.version },
          create: { key: 'protocol_version', value: protocolLock.version },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving settings:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
