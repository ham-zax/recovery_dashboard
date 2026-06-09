import { prisma } from './prisma';

export async function isProtocolLocked(): Promise<boolean> {
  const latestLock = await prisma.protocolLock.findFirst({
    orderBy: { createdAt: 'desc' },
  });
  if (!latestLock) return false;
  return new Date(latestLock.lockedUntil) > new Date();
}
