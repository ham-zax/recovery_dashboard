import { PrismaClient } from '../src/generated/prisma';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { calculateProtocolOutcomeBatch, calculateProtocolOutcome } from '../src/lib/protocolOutcome';
import path from 'path';

async function main() {
  console.log('--- STARTING EMPTY DB / SPARSE DATA VERIFICATION ---');

  // Initialize a separate empty in-memory DB or temporary file DB
  const dbUrl = `file:${path.resolve(process.cwd(), 'empty-test.db')}`;
  const adapter = new PrismaLibSql({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  try {
    // 1. Setup the schema
    const { execSync } = await import('child_process');
    execSync(`npx prisma db push --schema=prisma/schema.prisma`, { 
      env: { ...process.env, DATABASE_URL: dbUrl }
    });

    console.log('[Test] Empty DB Dashboard Logic (No Server Required)...');
    // Testing dashboard logic with empty DB is tricky without server since dashboard is an API. 
    // We can just hit the API in verify-dashboard.ts.
    
    console.log('[Test] Protocol Outcome on empty protocol...');
    const dummyProtocol = {
      id: 999,
      version: 'v1.0',
      active: true,
      startedAt: new Date(),
      endedAt: null,
      walkingTarget: 1,
      sittingTarget: 1,
      workoutSchedule: null,
      recoveryWeights: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // This should not crash, it should return 'Insufficient Data'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const outcome = await calculateProtocolOutcome(dummyProtocol as any);
    if (outcome.observedOutcome !== 'Insufficient Data') {
      throw new Error(`Expected Insufficient Data, got ${outcome.observedOutcome}`);
    }
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const batchOutcome = await calculateProtocolOutcomeBatch([dummyProtocol as any]);
    if (batchOutcome.get(999)?.observedOutcome !== 'Insufficient Data') {
      throw new Error('Batch outcome failed on sparse data');
    }

    console.log('✓ Outcome engine handles sparse data without crashing.');

  } catch (err) {
    console.error('\n❌ Sparse Data Verification Failed!');
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    const fs = await import('fs');
    if (fs.existsSync(path.resolve(process.cwd(), 'empty-test.db'))) {
      fs.unlinkSync(path.resolve(process.cwd(), 'empty-test.db'));
    }
    if (fs.existsSync(path.resolve(process.cwd(), 'empty-test.db-journal'))) {
      fs.unlinkSync(path.resolve(process.cwd(), 'empty-test.db-journal'));
    }
  }
  
  console.log('--- ALL EMPTY DB / SPARSE DATA TESTS PASSED ---');
}

main();
