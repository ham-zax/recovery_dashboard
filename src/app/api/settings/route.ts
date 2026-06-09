import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    const latestLock = await prisma.protocolLock.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      settings: settingsMap,
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
    const { settings, protocolLock } = body;

    // Check if there is a current protocol lock active
    const latestLock = await prisma.protocolLock.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const isLocked = latestLock ? new Date(latestLock.lockedUntil) > new Date() : false;

    // If locked, prevent changes to protocol settings
    if (isLocked && settings) {
      const lockedKeys = [
        'recovery_score_weights',
        'workout_schedule',
        'protocol_start_date',
        'protocol_duration_days',
      ];

      const attemptedChanges = [];
      for (const key of lockedKeys) {
        if (key in settings) {
          const existingSetting = await prisma.setting.findUnique({
            where: { key },
          });
          const existingValue = existingSetting ? existingSetting.value : '';
          const newValue = String(settings[key]);
          if (existingValue !== newValue) {
            attemptedChanges.push(key);
          }
        }
      }
      
      if (attemptedChanges.length > 0) {
        const formattedDate = latestLock
          ? new Date(latestLock.lockedUntil).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'set date';
        return NextResponse.json({
          error: `Protocol is locked until ${formattedDate}. Cannot modify protocol settings: ${attemptedChanges.join(', ')}.`,
        }, { status: 403 });
      }
    }

    // Update settings
    if (settings) {
      for (const [key, value] of Object.entries(settings)) {
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
      
      // If currently locked, verify we aren't bypassing lock controls (like making it shorter)
      if (latestLock && newLockDate < latestLock.lockedUntil) {
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
        update: { value: newLockDate.toISOString().split('T')[0] },
        create: { key: 'protocol_locked_until', value: newLockDate.toISOString().split('T')[0] },
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
