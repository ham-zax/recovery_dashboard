import { PrismaClient } from '../src/generated/prisma';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';
import fs from 'fs';
import { RuntimeEventProvider } from '../src/lib/recoveryEvents';

// Load .env manually to ensure script uses the same DB as dev server
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  }
} catch (err) {
  console.warn('Failed to load .env file:', err);
}

const dbUrl = process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), 'dev.db')}`;
const authToken = process.env.TOKEN;
const adapter = new PrismaLibSql({ url: dbUrl, authToken });
const prisma = new PrismaClient({ adapter });

async function verifyProtocolInvariants() {
  console.log('\n[Invariant] Verifying Protocol State...');
  const activeProtocols = await prisma.protocol.findMany({
    where: { active: true },
  });

  if (activeProtocols.length !== 1) {
    if (activeProtocols.length === 0) {
      const totalProtocols = await prisma.protocol.count();
      if (totalProtocols > 0) {
        throw new Error('No active protocol found, but protocols exist.');
      }
    } else {
      throw new Error(`Multiple active protocols found: ${activeProtocols.length}`);
    }
  }

  const allProtocols = await prisma.protocol.findMany({
    include: { logs: true },
  });
  
  const validProtocolIds = new Set(allProtocols.map(p => p.id));

  for (const protocol of allProtocols) {
    if (!protocol.active && !protocol.endedAt) {
      throw new Error(`Protocol ${protocol.id} is inactive but has no endedAt timestamp.`);
    }
  }

  // protocolId is non-nullable in schema so database enforces that every log/workout has a protocolId

  // every ProtocolChange points to valid protocols
  const changes = await prisma.protocolChange.findMany();
  for (const change of changes) {
    if (change.fromProtocolId && !validProtocolIds.has(change.fromProtocolId)) {
      throw new Error(`ProtocolChange ${change.id} points to invalid fromProtocolId ${change.fromProtocolId}`);
    }
    if (change.toProtocolId && !validProtocolIds.has(change.toProtocolId)) {
      throw new Error(`ProtocolChange ${change.id} points to invalid toProtocolId ${change.toProtocolId}`);
    }
  }

  console.log('✓ Protocol State Invariants passed.');
}

async function verifyEventInvariants() {
  console.log('\n[Invariant] Verifying Event Integrity...');
  const logs = await prisma.dailyLog.findMany({ orderBy: { date: 'asc' }, include: { protocol: true } });
  const workouts = await prisma.workoutSession.findMany({ orderBy: { date: 'asc' } });
  const protocolChanges = await prisma.protocolChange.findMany({ orderBy: { changedAt: 'asc' } });

  const events = RuntimeEventProvider.getEvents(logs, workouts, protocolChanges);
  
  const idSet = new Set<string>();
  for (const event of events) {
    if (idSet.has(event.id)) {
      throw new Error(`Duplicate event ID detected: ${event.id}`);
    }
    idSet.add(event.id);
  }

  const dashboardEvents = RuntimeEventProvider.selectDashboardEvents(events, 100);
  for (const event of dashboardEvents) {
    if (!event.dashboardEligible) {
      throw new Error(`Event ${event.id} is on the dashboard but dashboardEligible is false.`);
    }
  }

  console.log(`✓ Event Integrity Invariants passed. Evaluated ${events.length} events.`);
}

async function main() {
  console.log('--- STARTING INVARIANT VERIFICATION ---');
  let success = false;
  try {
    await verifyProtocolInvariants();
    await verifyEventInvariants();
    success = true;
  } catch (err) {
    console.error('\n❌ Invariant Verification Failed!');
    console.error(err);
  } finally {
    await prisma.$disconnect();
    process.exit(success ? 0 : 1);
  }
}

main();
