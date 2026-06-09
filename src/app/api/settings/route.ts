import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { isProtocolLocked } from '@/lib/lock';
import { getActiveProtocol, updateActiveProtocol } from '@/lib/protocol';

export async function GET() {
  try {
    const settings = await prisma.setting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      settingsMap[s.key] = s.value;
    }

    const protocol = await getActiveProtocol();
    
    // LEGACY API COMPATIBILITY SHIM
    // The UI still expects these protocol fields to be present in the general
    // 'settings' dictionary. We synthesize them here to maintain backwards 
    // compatibility with the SettingsContent component without needing UI rewrites yet.
    // TODO: Remove this once SettingsContent UI is updated to fetch Protocol fields directly.
    settingsMap['sitting_breaks_target'] = protocol.sittingTarget.toString();
    settingsMap['walking_target'] = protocol.walkingTarget.toString();
    if (protocol.recoveryWeights) {
      settingsMap['recovery_score_weights'] = protocol.recoveryWeights;
    }
    settingsMap['protocol_version'] = protocol.version;

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

    const isLocked = await isProtocolLocked();

    if (settings) {
      const protocolUpdate: { sittingTarget?: number; walkingTarget?: number; recoveryWeights?: string } = {};
      const genericSettings: Record<string, string> = {};

      for (const [key, value] of Object.entries(settings)) {
        if (key === 'sitting_breaks_target') {
          protocolUpdate.sittingTarget = parseInt(String(value), 10);
        } else if (key === 'walking_target') {
          protocolUpdate.walkingTarget = parseInt(String(value), 10);
        } else if (key === 'recovery_score_weights') {
          protocolUpdate.recoveryWeights = String(value);
        } else {
          genericSettings[key] = String(value);
        }
      }

      const activeProtocol = await getActiveProtocol();
      let protocolChanged = false;
      if (protocolUpdate.sittingTarget !== undefined && protocolUpdate.sittingTarget !== activeProtocol.sittingTarget) protocolChanged = true;
      if (protocolUpdate.walkingTarget !== undefined && protocolUpdate.walkingTarget !== activeProtocol.walkingTarget) protocolChanged = true;
      if (protocolUpdate.recoveryWeights !== undefined && protocolUpdate.recoveryWeights !== activeProtocol.recoveryWeights) protocolChanged = true;

      // If locked, prevent changes to legacy generic settings
      // Note: Protocol field mutations are now strictly enforced by updateActiveProtocol() below.
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

      // Update settings
      // Ownership boundaries: updateActiveProtocol() will reject internally if locked
      if (protocolChanged) {
        try {
          await updateActiveProtocol(protocolUpdate);
        } catch (e) {
          return NextResponse.json({ error: (e as Error).message }, { status: 403 });
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
