import { SettingsContent } from '@/components/SettingsContent';
import { prisma } from '@/lib/prisma';
import { getActiveProtocol } from '@/lib/protocol';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const [settingsList, protocol, lock, exercises] = await Promise.all([
    prisma.setting.findMany(),
    getActiveProtocol(),
    prisma.protocolLock.findFirst({
      orderBy: { createdAt: 'desc' }
    }),
    prisma.exercise.findMany({
      where: { active: true },
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })
  ]);

  const settingsMap = settingsList.reduce((acc, s) => {
    acc[s.key] = s.value;
    return acc;
  }, {} as Record<string, string>);

  const protocolProps = {
    id: protocol.id,
    version: protocol.version,
    walkingTarget: protocol.walkingTarget,
    sittingTarget: protocol.sittingTarget,
    recoveryWeights: protocol.recoveryWeights ? JSON.parse(protocol.recoveryWeights) : undefined,
    workoutSchedule: protocol.workoutSchedule ? JSON.parse(protocol.workoutSchedule) : undefined,
    active: protocol.active,
  };

  const lockProps = lock ? {
    version: lock.version,
    lockedUntil: lock.lockedUntil.toISOString(),
    description: lock.description || '',
  } : null;

  return (
    <SettingsContent 
      initialSettings={settingsMap}
      initialProtocol={protocolProps as any}
      initialLock={lockProps}
      initialExercises={exercises as any}
    />
  );
}
