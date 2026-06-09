import { prisma } from './prisma';
import { isProtocolLocked } from './lock';
import { Prisma } from '../generated/prisma';

export async function getActiveProtocol() {
  let protocol = await prisma.protocol.findFirst({
    where: { active: true },
  });

  if (!protocol) {
    // Enforce the invariant by bootstrapping the initial v1.0 protocol 
    // if none exists. Using upsert prevents race conditions where 
    // concurrent requests might try to create v1.0 simultaneously.
    protocol = await prisma.protocol.upsert({
      where: { version: 'v1.0' },
      update: { active: true },
      create: {
        version: 'v1.0',
        active: true,
        walkingTarget: 1,
        sittingTarget: 10,
        recoveryWeights: JSON.stringify({
          pain: 25, reflux: 15, walking: 25, compliance: 15, strength: 20
        })
      },
    });
  }

  return protocol;
}

export async function updateActiveProtocol(data: Prisma.ProtocolUpdateInput, reason?: string, notes?: string) {
  if (await isProtocolLocked()) {
    throw new Error('Protocol is currently locked and cannot be modified.');
  }

  const active = await getActiveProtocol();

  // If the active protocol has no logs yet, we can safely mutate it
  const logCount = await prisma.dailyLog.count({ where: { protocolId: active.id } });
  
  if (logCount === 0) {
    return prisma.protocol.update({
      where: { id: active.id },
      data,
    });
  }

  // Otherwise, create a new version
  // v1.0 -> v1.1
  const match = active.version.match(/v(\d+)\.(\d+)/);
  const nextVersion = match 
    ? `v${match[1]}.${parseInt(match[2], 10) + 1}` 
    : `${active.version}.1`;

  // Run in transaction to ensure atomic switch
  const result = await prisma.$transaction(async (tx) => {
    // Close current
    await tx.protocol.update({
      where: { id: active.id },
      data: {
        active: false,
        endedAt: new Date(),
      }
    });

    // Create new
    const newProtocol = await tx.protocol.create({
      data: {
        version: nextVersion,
        active: true,
        startedAt: new Date(),
        walkingTarget: data.walkingTarget !== undefined ? (data.walkingTarget as number) : active.walkingTarget,
        sittingTarget: data.sittingTarget !== undefined ? (data.sittingTarget as number) : active.sittingTarget,
        recoveryWeights: data.recoveryWeights !== undefined ? (data.recoveryWeights as string) : active.recoveryWeights,
        workoutSchedule: data.workoutSchedule !== undefined ? (data.workoutSchedule as string) : active.workoutSchedule,
      }
    });

    // Compute changes
    const changes: Record<string, unknown> = {};
    if (data.walkingTarget !== undefined && data.walkingTarget !== active.walkingTarget) {
      changes.walkingTarget = { from: active.walkingTarget, to: data.walkingTarget };
    }
    if (data.sittingTarget !== undefined && data.sittingTarget !== active.sittingTarget) {
      changes.sittingTarget = { from: active.sittingTarget, to: data.sittingTarget };
    }
    if (data.recoveryWeights !== undefined && data.recoveryWeights !== active.recoveryWeights) {
      changes.recoveryWeights = { 
        from: active.recoveryWeights ? JSON.parse(active.recoveryWeights) : null,
        to: JSON.parse(data.recoveryWeights as string)
      };
    }
    if (data.workoutSchedule !== undefined && data.workoutSchedule !== active.workoutSchedule) {
      changes.workoutSchedule = {
        from: JSON.parse(active.workoutSchedule),
        to: JSON.parse(data.workoutSchedule as string)
      };
    }

    // Create ProtocolChange
    await tx.protocolChange.create({
      data: {
        fromProtocolId: active.id,
        toProtocolId: newProtocol.id,
        changes: JSON.stringify(changes),
        reason: reason || null,
        notes: notes || null,
      }
    });

    return newProtocol;
  });

  return result;
}

/**
 * Ensures exactly one protocol is active.
 * Used when switching versions historically.
 */
export async function activateProtocol(id: number) {
  return prisma.$transaction([
    prisma.protocol.updateMany({ 
      where: { active: true },
      data: { active: false } 
    }),
    prisma.protocol.update({ 
      where: { id }, 
      data: { active: true } 
    })
  ]);
}
