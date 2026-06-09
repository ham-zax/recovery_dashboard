import { SettingsContent, Exercise, ProtocolState, ScoreWeights, WorkoutSchedule } from '@/components/SettingsContent';
import { prisma } from '@/lib/prisma';
import { getActiveProtocol } from '@/lib/protocol';
import { format, addDays } from 'date-fns';

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

  const protocolProps: ProtocolState = {
    id: protocol.id,
    version: protocol.version,
    walkingTarget: protocol.walkingTarget,
    sittingTarget: protocol.sittingTarget,
    recoveryWeights: protocol.recoveryWeights ? (JSON.parse(protocol.recoveryWeights) as ScoreWeights) : undefined,
    workoutSchedule: protocol.workoutSchedule ? (JSON.parse(protocol.workoutSchedule) as WorkoutSchedule) : undefined,
    active: protocol.active,
  };

  const lockProps = lock ? {
    version: lock.version,
    lockedUntil: lock.lockedUntil.toISOString(),
    description: lock.description || '',
  } : null;

  const exercisesProps: Exercise[] = exercises.map(ex => {
    if (ex.category !== 'LOWER' && ex.category !== 'UPPER') {
      throw new Error(`Invalid exercise category: ${ex.category}`);
    }
    return {
      id: ex.id,
      name: ex.name,
      category: ex.category,
      sortOrder: ex.sortOrder,
      active: ex.active
    };
  });

  const defaultLockDate = format(addDays(new Date(), 14), 'yyyy-MM-dd');

  const compositeKey = JSON.stringify({
    settings: settingsMap,
    protocol: protocolProps,
    lock: lockProps,
    exercises: exercisesProps,
  });

  return (
    <SettingsContent 
      key={compositeKey}
      initialSettings={settingsMap}
      initialProtocol={protocolProps}
      initialLock={lockProps}
      initialExercises={exercisesProps}
      defaultLockDate={defaultLockDate}
    />
  );
}
