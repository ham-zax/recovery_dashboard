import { prisma } from './prisma';

export async function isProtocolLocked(): Promise<boolean> {
  const activeLock = await prisma.protocolLock.findFirst({
    where: {
      lockedUntil: {
        gt: new Date(),
      },
    },
  });
  return !!activeLock;
}
