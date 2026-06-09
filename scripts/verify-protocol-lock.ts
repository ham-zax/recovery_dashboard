import { prisma } from '../src/lib/prisma';
import { getActiveProtocol, updateActiveProtocol } from '../src/lib/protocol';
import { isProtocolLocked } from '../src/lib/lock';
import { getDashboardData } from '../src/lib/aggregations';
import { getWeeklyReviewData } from '../src/lib/reviewData';

async function runTests() {
  console.log('--- Starting Protocol Invariant Tests ---\n');

  try {
    // 1. Ensure we have an active protocol
    console.log('[Test] getActiveProtocol()...');
    const protocol = await getActiveProtocol();
    if (!protocol) throw new Error('getActiveProtocol() returned null');
    console.log(`✅ Protocol loaded. ID: ${protocol.id}, Version: ${protocol.version}`);

    console.log('\n[Test] Exactly one active protocol...');
    const activeCount = await prisma.protocol.count({ where: { active: true } });
    if (activeCount !== 1) throw new Error(`Expected exactly 1 active protocol, found ${activeCount}`);
    console.log('✅ Exactly one protocol is active.');

    console.log('\n[Test] Protocol weights are valid JSON...');
    if (protocol.recoveryWeights) {
      try {
        JSON.parse(protocol.recoveryWeights);
      } catch {
        throw new Error('Protocol weights failed to parse as JSON');
      }
    }
    console.log('✅ Protocol weights parse successfully.');

    // Clear any existing locks for a clean slate
    await prisma.protocolLock.deleteMany();

    // 2. Unlocked protocol mutation => succeeds
    console.log('\n[Test] Unlocked protocol mutation...');
    const isLockedFirst = await isProtocolLocked();
    if (isLockedFirst) throw new Error('Protocol should not be locked initially.');
    
    await updateActiveProtocol({ sittingTarget: 15 });
    const updated = await getActiveProtocol();
    if (updated.sittingTarget !== 15) throw new Error('Sitting target did not update.');
    console.log('✅ Unlocked protocol mutation succeeded.');

    // 3. Lock the protocol
    console.log('\n[Test] Locking protocol...');
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    await prisma.protocolLock.create({
      data: {
        version: protocol.version,
        lockedUntil: futureDate,
        description: 'Test lock',
      }
    });
    console.log('✅ Protocol locked.');

    // 4. Locked protocol mutation => rejected
    console.log('\n[Test] Locked protocol mutation...');
    let mutationRejected = false;
    try {
      await updateActiveProtocol({ sittingTarget: 20 });
    } catch (err) {
      if (err instanceof Error && err.message.includes('Protocol is currently locked')) {
        mutationRejected = true;
      }
    }
    if (!mutationRejected) {
      throw new Error('Locked protocol mutation was NOT rejected.');
    }
    console.log('✅ Locked protocol mutation rejected correctly.');

    // 5. Dashboard reads active protocol
    console.log('\n[Test] Dashboard reads active protocol...');
    const dashboardData = await getDashboardData(7);
    if (!dashboardData) throw new Error('Dashboard data failed to generate.');
    // Just verifying it runs successfully because getDashboardData fetches protocol weights
    console.log('✅ Dashboard read active protocol successfully.');

    // 6. Review reads active protocol
    console.log('\n[Test] Review reads active protocol...');
    const reviewData = await getWeeklyReviewData(new Date().toISOString());
    if (!reviewData) throw new Error('Review data failed to generate.');
    console.log('✅ Review read active protocol successfully.');

    // Cleanup
    await prisma.protocolLock.deleteMany();
    await updateActiveProtocol({ sittingTarget: 10 }); // reset

    console.log('\n--- All Protocol Invariant Tests Passed ✅ ---');
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
