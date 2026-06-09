import { spawn, ChildProcess } from 'child_process';
import { PrismaClient } from '../src/generated/prisma';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';
import fs from 'fs';

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

// Setup database connection directly using same URL and Token as main app
const dbUrl = process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), 'dev.db')}`;
const authToken = process.env.TOKEN;
const adapter = new PrismaLibSql({ url: dbUrl, authToken });
const prisma = new PrismaClient({ adapter });

const TEST_PORT = 3005;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper to poll the server until it is ready
async function waitForServer(child: ChildProcess): Promise<boolean> {
  const maxAttempts = 30;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`${BASE_URL}/api/dashboard?days=7`);
      if (res.status === 200) {
        console.log(`Server is ready on port ${TEST_PORT} after ${attempt} attempts.`);
        return true;
      }
    } catch {
      // Server not ready yet
    }
    
    // Check if process exited early
    if (child.killed || child.exitCode !== null) {
      console.error('Next.js dev server exited prematurely.');
      return false;
    }
    
    await wait(1000);
  }
  return false;
}

async function runTests() {
  console.log('--- STARTING INVARIANT VERIFICATION TESTS ---');
  
  // ----------------------------------------------------
  // Test 1: Dashboard API Response Shape and Compliance
  // ----------------------------------------------------
  console.log('\n[Test 1] Verifying /api/dashboard shape & daily compliance field...');
  const dashRes = await fetch(`${BASE_URL}/api/dashboard?days=7`);
  if (dashRes.status !== 200) {
    throw new Error(`Dashboard API failed with status ${dashRes.status}`);
  }
  const dashData = await dashRes.json();
  
  // Validate basic shape
  if (typeof dashData.recoveryState !== 'object' || !dashData.metrics || !Array.isArray(dashData.chartData)) {
    throw new Error('Dashboard API response shape is invalid.');
  }
  
  // Validate daily compliance field
  const firstPoint = dashData.chartData[0];
  if (firstPoint && typeof firstPoint.compliance !== 'number') {
    throw new Error('Dashboard chartData is missing the "compliance" field or it is not a number.');
  }
  console.log('✓ Dashboard API response shape and compliance field verified successfully.');

  // ----------------------------------------------------
  // Test 2: JSON Export Integrity & Database Row Counts
  // ----------------------------------------------------
  console.log('\n[Test 2] Verifying JSON Export Integrity and Row Count Matching...');
  const jsonExportRes = await fetch(`${BASE_URL}/api/export?format=json`);
  if (jsonExportRes.status !== 200) {
    throw new Error(`JSON export endpoint returned status ${jsonExportRes.status}`);
  }
  
  const contentDisp = jsonExportRes.headers.get('content-disposition') || '';
  if (!contentDisp.includes('attachment') || !contentDisp.includes('.json')) {
    throw new Error(`JSON export header Content-Disposition is invalid: ${contentDisp}`);
  }

  const exportJson = await jsonExportRes.json();
  const requiredEntities = ['dailyLogs', 'workouts', 'weeklyReviews', 'protocolLocks', 'settings', 'exercises'];
  for (const ent of requiredEntities) {
    if (!Array.isArray(exportJson[ent])) {
      throw new Error(`Export JSON is missing entity array: ${ent}`);
    }
  }

  // Verify JSON serialization round-trip safety (checking for Decimal/BigInt serialization issues)
  const roundtripJson = JSON.parse(JSON.stringify(exportJson));
  if (roundtripJson.exercises.length > 0) {
    const firstEx = roundtripJson.exercises[0];
    if (typeof firstEx.id !== 'number' || typeof firstEx.name !== 'string' || typeof firstEx.active !== 'boolean') {
      throw new Error('Export JSON contains corrupted or non-serializable exercise records.');
    }
  }

  // Verify row counts match database exactly
  const dbLogsCount = await prisma.dailyLog.count();
  const dbWorkoutsCount = await prisma.workoutSession.count();
  const dbReviewsCount = await prisma.weeklyReview.count();
  const dbLocksCount = await prisma.protocolLock.count();
  const dbSettingsCount = await prisma.setting.count();
  const dbExercisesCount = await prisma.exercise.count();

  console.log(`Database counts -> logs: ${dbLogsCount}, workouts: ${dbWorkoutsCount}, reviews: ${dbReviewsCount}, locks: ${dbLocksCount}, settings: ${dbSettingsCount}, exercises: ${dbExercisesCount}`);
  console.log(`Export counts   -> logs: ${exportJson.dailyLogs.length}, workouts: ${exportJson.workouts.length}, reviews: ${exportJson.weeklyReviews.length}, locks: ${exportJson.protocolLocks.length}, settings: ${exportJson.settings.length}, exercises: ${exportJson.exercises.length}`);

  if (exportJson.dailyLogs.length !== dbLogsCount ||
      exportJson.workouts.length !== dbWorkoutsCount ||
      exportJson.weeklyReviews.length !== dbReviewsCount ||
      exportJson.protocolLocks.length !== dbLocksCount ||
      exportJson.settings.length !== dbSettingsCount ||
      exportJson.exercises.length !== dbExercisesCount) {
    throw new Error('Export row counts do not match SQLite database record counts.');
  }
  console.log('✓ Export JSON integrity and database row count matching verified successfully.');

  // ----------------------------------------------------
  // Test 3: CSV Export Integrity
  // ----------------------------------------------------
  console.log('\n[Test 3] Verifying CSV Export Integrity...');
  const csvExportRes = await fetch(`${BASE_URL}/api/export?format=csv`);
  if (csvExportRes.status !== 200) {
    throw new Error(`CSV export endpoint returned status ${csvExportRes.status}`);
  }
  
  const csvContentDisp = csvExportRes.headers.get('content-disposition') || '';
  if (!csvContentDisp.includes('attachment') || !csvContentDisp.includes('.csv')) {
    throw new Error(`CSV export header Content-Disposition is invalid: ${csvContentDisp}`);
  }

  const csvText = await csvExportRes.text();
  const lines = csvText.trim().split('\n');
  const headers = lines[0];
  const expectedHeaders = 'Date,Pain (0-10),Reflux (0-10),Walked Today,Strength Today,Sleep Hours,Sitting Breaks Actual,Sitting Breaks Target,Notes';
  
  if (headers !== expectedHeaders) {
    throw new Error(`CSV headers do not match expected stable names. Found: ${headers}`);
  }
  
  // Exclude header row from count comparison
  const csvRecordCount = lines.length - 1;
  if (csvRecordCount !== dbLogsCount) {
    throw new Error(`CSV record count (${csvRecordCount}) does not match database DailyLog count (${dbLogsCount}).`);
  }
  console.log('✓ CSV export headers and record counts verified successfully.');

  // ----------------------------------------------------
  // Test 4: Protocol Lock Server-side Enforcement
  // ----------------------------------------------------
  console.log('\n[Test 4] Testing Server-Side Protocol Lock Enforcement...');
  
  // 1. Create a protocol lock 1 hour in the future directly in database
  const lockUntilDate = new Date(Date.now() + 60 * 60 * 1000);
  const lock = await prisma.protocolLock.create({
    data: {
      version: 'v9.9-test-lock',
      lockedUntil: lockUntilDate,
      description: 'Programmatic Verification Lock Test',
    },
  });

  try {
    // 2. Attempt Settings Update mutation on locked keys (expecting 403)
    const settingsUpdateRes = await fetch(`${BASE_URL}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        protocol: {
          recoveryWeights: { walking: 50, strength: 10, sleep: 20, sitting: 10, checkins: 10 },
        },
      }),
    });
    if (settingsUpdateRes.status !== 403) {
      throw new Error(`Server allowed mutating settings under protocol lock! Got status: ${settingsUpdateRes.status}`);
    }
    console.log('  - Mutation to settings/weights successfully blocked (403).');

    // 3. Attempt Exercise Creation (expecting 403)
    const addExerciseRes = await fetch(`${BASE_URL}/api/exercises`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Illegal Lock Exercise',
        category: 'LOWER',
      }),
    });
    if (addExerciseRes.status !== 403) {
      throw new Error(`Server allowed creating an exercise under protocol lock! Got status: ${addExerciseRes.status}`);
    }
    console.log('  - Mutation to create exercise successfully blocked (403).');

    // 4. Attempt Exercise Update (expecting 403)
    const updateExerciseRes = await fetch(`${BASE_URL}/api/exercises/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Illegal Update' }),
    });
    if (updateExerciseRes.status !== 403) {
      throw new Error(`Server allowed updating an exercise under protocol lock! Got status: ${updateExerciseRes.status}`);
    }
    console.log('  - Mutation to update exercise successfully blocked (403).');

    // 5. Attempt Exercise Deactivation (expecting 403)
    const deleteExerciseRes = await fetch(`${BASE_URL}/api/exercises/1`, {
      method: 'DELETE',
    });
    if (deleteExerciseRes.status !== 403) {
      throw new Error(`Server allowed deactivating an exercise under protocol lock! Got status: ${deleteExerciseRes.status}`);
    }
    console.log('  - Mutation to delete exercise successfully blocked (403).');

  } finally {
    // Clean up test lock
    await prisma.protocolLock.delete({
      where: { id: lock.id },
    });
  }
  console.log('✓ Protocol Lock Server-side Enforcement successfully verified.');

  // ----------------------------------------------------
  // Test 5: Settings Mutation Write Integrity (Concurrency Probe)
  // ----------------------------------------------------
  console.log('\n[Test 5] Probing mutation write integrity under concurrent settings writes...');
  
  // We send two concurrent updates to change settings
  const payload1 = {
    settings: {
      theme_mode: 'dark',
    },
  };
  const payload2 = {
    settings: {
      theme_mode: 'light',
    },
  };

  const promises = [
    fetch(`${BASE_URL}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload1),
    }),
    fetch(`${BASE_URL}/api/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload2),
    }),
  ];

  const results = await Promise.all(promises);
  console.log(`  - Concurrent updates sent. HTTP statuses: ${results[0].status}, ${results[1].status}`);

  if (results[0].status !== 200 || results[1].status !== 200) {
    throw new Error('One of the concurrent settings mutation requests failed.');
  }

  // Assert database final state is consistent
  const finalSetting = await prisma.setting.findUnique({
    where: { key: 'theme_mode' },
  });
  
  console.log(`  - Final setting value in database: ${finalSetting?.value}`);
  if (finalSetting?.value !== 'dark' && finalSetting?.value !== 'light') {
    throw new Error(`Database left in inconsistent state after concurrent writes: ${finalSetting?.value}`);
  }
  console.log('✓ Concurrent Mutation Write Integrity Probe executed successfully.');

  // ----------------------------------------------------
  // Test 6: Empty Database Fallback (Dashboard & Review)
  // ----------------------------------------------------
  console.log('\n[Test 6] Verifying endpoints with an empty database...');
  
  // We'll spawn a temporary server with an empty db to check
  const emptyDbPath = path.resolve(process.cwd(), 'empty-verify.db');
  if (fs.existsSync(emptyDbPath)) fs.unlinkSync(emptyDbPath);
  
  // Push schema
  const { execSync } = await import('child_process');
  execSync(`npx prisma db push --schema=prisma/schema.prisma`, { 
    env: { ...process.env, DATABASE_URL: `file:${emptyDbPath}` }
  });

  const EMPTY_PORT = 3006;
  const emptyDevServer = spawn('npx', ['next', 'start', '-p', String(EMPTY_PORT)], {
    env: { ...process.env, DATABASE_URL: `file:${emptyDbPath}` },
    stdio: 'ignore',
    shell: true,
  });

  try {
    const isReady = await waitForServerSpecific(emptyDevServer, EMPTY_PORT);
    if (!isReady) throw new Error('Failed to start empty Next.js dev server.');

    const emptyDashRes = await fetch(`http://localhost:${EMPTY_PORT}/api/dashboard?days=7`);
    if (emptyDashRes.status !== 200) throw new Error(`Empty Dashboard API failed: ${emptyDashRes.status}`);
    const emptyDashData = await emptyDashRes.json();
    if (emptyDashData.chartData && emptyDashData.chartData.length !== 7) {
       throw new Error('Empty Dashboard did not return 7 zero-filled days.');
    }

    const emptyReviewRes = await fetch(`http://localhost:${EMPTY_PORT}/api/review?weekStarting=2024-01-01`);
    if (emptyReviewRes.status !== 200) throw new Error(`Empty Review API failed: ${emptyReviewRes.status}`);
    
    console.log('✓ Empty database fallbacks verified successfully.');
  } finally {
    emptyDevServer.kill('SIGTERM');
    if (fs.existsSync(emptyDbPath)) fs.unlinkSync(emptyDbPath);
    if (fs.existsSync(emptyDbPath + '-journal')) fs.unlinkSync(emptyDbPath + '-journal');
  }

  console.log('\n--- ALL INVARIANT VERIFICATION TESTS PASSED SUCCESSFULLY ---');
}

async function waitForServerSpecific(child: ChildProcess, port: number): Promise<boolean> {
  const maxAttempts = 30;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(`http://localhost:${port}/api/dashboard?days=7`);
      if (res.status === 200) return true;
    } catch {}
    if (child.killed || child.exitCode !== null) return false;
    await wait(1000);
  }
  return false;
}

async function main() {
  console.log('Starting Next.js production server for verification tests...');
  
  const devServer = spawn('npx', ['next', 'start', '-p', String(TEST_PORT)], {
    stdio: 'ignore', // Suppress output to keep verification log clean
    shell: true,
  });

  let success = false;
  try {
    const isReady = await waitForServer(devServer);
    if (!isReady) {
      throw new Error('Failed to start Next.js dev server in time.');
    }
    
    await runTests();
    success = true;
  } catch (error) {
    console.error('\n❌ Test execution failed!');
    console.error(error);
  } finally {
    console.log('\nTearing down Next.js dev server...');
    devServer.kill('SIGTERM');
    // Ensure database client is closed
    await prisma.$disconnect();
    
    process.exit(success ? 0 : 1);
  }
}

main();
