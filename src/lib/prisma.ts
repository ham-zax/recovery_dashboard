import { PrismaClient } from '../generated/prisma';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'node:path';

const url = process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), 'dev.db')}`;
const authToken = process.env.TOKEN;

const adapter = new PrismaLibSql({
  url: url,
  authToken: authToken,
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ 
  adapter
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
