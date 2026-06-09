import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '..', 'dev.db');

const adapter = new PrismaLibSql({
  url: `file:${dbPath}`,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed exercises
  const lowerExercises = [
    { name: 'Bulgarian Split Squat', category: 'LOWER', sortOrder: 1 },
    { name: 'Single Leg Bridge', category: 'LOWER', sortOrder: 2 },
    { name: 'Step Down', category: 'LOWER', sortOrder: 3 },
    { name: 'Balance', category: 'LOWER', sortOrder: 4 },
    { name: 'Calf Raise', category: 'LOWER', sortOrder: 5 },
    { name: 'Dead Bug', category: 'LOWER', sortOrder: 6 },
  ];

  const upperExercises = [
    { name: 'Rows', category: 'UPPER', sortOrder: 1 },
    { name: 'Push-Up Plus', category: 'UPPER', sortOrder: 2 },
    { name: 'Carry', category: 'UPPER', sortOrder: 3 },
  ];

  // Clear and re-seed exercises
  await prisma.exercise.deleteMany();
  for (const exercise of [...lowerExercises, ...upperExercises]) {
    await prisma.exercise.create({ data: exercise });
  }

  // Seed settings
  const settings = [
    { key: 'recovery_score_weights', value: JSON.stringify({ walking: 30, strength: 25, sleep: 20, sitting: 15, checkins: 10 }) },
    { key: 'protocol_version', value: 'v1.0' },
    { key: 'protocol_start_date', value: '2026-06-09' },
    { key: 'protocol_duration_days', value: '84' },
    { key: 'protocol_locked_until', value: '2026-07-21' },
    { key: 'sitting_breaks_target', value: '10' },
    { key: 'weekly_review_day', value: 'sunday' },
    { key: 'workout_schedule', value: JSON.stringify({ mon: 'LOWER', tue: 'UPPER', wed: 'REST', thu: 'LOWER', fri: 'UPPER', sat: 'REST', sun: 'REST' }) },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }

  // Seed protocol lock
  const existingLock = await prisma.protocolLock.findFirst();
  if (!existingLock) {
    await prisma.protocolLock.create({
      data: {
        version: 'v1.0',
        lockedUntil: new Date('2026-07-21'),
        description: 'Execute one protocol consistently for 12 weeks.',
      },
    });
  }

  console.log('✅ Database seeded successfully');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
