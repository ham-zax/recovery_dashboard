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

export async function updateActiveProtocol(data: Prisma.ProtocolUpdateInput) {
  if (await isProtocolLocked()) {
    throw new Error('Protocol is currently locked and cannot be modified.');
  }

  const active = await getActiveProtocol();

  return prisma.protocol.update({
    where: { id: active.id },
    data,
  });
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
