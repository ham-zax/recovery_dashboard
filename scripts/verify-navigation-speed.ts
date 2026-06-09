import { spawn, ChildProcess } from 'child_process';
import puppeteer from 'puppeteer-core';

const TEST_PORT = 3006;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Poll server until ready
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
    
    if (child.killed || child.exitCode !== null) {
      console.error('Next.js production server exited prematurely.');
      return false;
    }
    
    await wait(1000);
  }
  return false;
}

async function runLatencyTests() {
  console.log('--- STARTING NAVIGATION LATENCY VERIFICATION TESTS ---');
  
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport to desktop to ensure sidebar nav links are visible and clickable
    await page.setViewport({ width: 1280, height: 800 });

    console.log('\n[Test A] Initializing Page Load...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    console.log('✓ Dashboard home loaded successfully.');

    // ----------------------------------------------------
    // Test 1: First Navigation to Review (Network-bound)
    // ----------------------------------------------------
    console.log('\n[Test 1] Navigating to Weekly Review first time (expecting network-bound transition)...');
    
    const firstReviewTime = await page.evaluate(async () => {
      const start = performance.now();
      const link = document.querySelector('a[href="/review"]') as HTMLElement;
      if (!link) throw new Error('Weekly Review sidebar link not found');
      link.click();
      
      return new Promise<number>((resolve, reject) => {
        const check = () => {
          if (document.body.innerText.includes('Weekly Stats Snapshot')) {
            resolve(performance.now() - start);
          } else if (performance.now() - start > 10000) {
            reject(new Error('Weekly Review first nav timeout after 10s'));
          } else {
            setTimeout(check, 5);
          }
        };
        check();
      });
    });

    console.log(`  - First transition to Review took: ${firstReviewTime.toFixed(1)}ms`);

    // ----------------------------------------------------
    // Test 2: Navigate back to Dashboard (Network-bound / Cache fill)
    // ----------------------------------------------------
    console.log('\n[Test 2] Navigating back to Dashboard first time...');
    const firstDashTime = await page.evaluate(async () => {
      const start = performance.now();
      const link = document.querySelector('a[href="/"]') as HTMLElement;
      if (!link) throw new Error('Dashboard sidebar link not found');
      link.click();
      
      return new Promise<number>((resolve, reject) => {
        const check = () => {
          if (document.body.innerText.includes('Recovery Score')) {
            resolve(performance.now() - start);
          } else if (performance.now() - start > 10000) {
            reject(new Error('Dashboard first nav timeout after 10s'));
          } else {
            setTimeout(check, 5);
          }
        };
        check();
      });
    });

    console.log(`  - First transition back to Dashboard took: ${firstDashTime.toFixed(1)}ms`);

    // Wait 1 second to ensure Router Cache dynamic staleTimes (30s) is active
    await wait(1000);

    // ----------------------------------------------------
    // Test 3: Second Navigation to Review (Cache-hit / SWR)
    // ----------------------------------------------------
    console.log('\n[Test 3] Navigating to Weekly Review second time (expecting instant transition from Router Cache)...');
    
    const secondReviewTime = await page.evaluate(async () => {
      const start = performance.now();
      const link = document.querySelector('a[href="/review"]') as HTMLElement;
      if (!link) throw new Error('Weekly Review sidebar link not found');
      link.click();
      
      return new Promise<number>((resolve, reject) => {
        const check = () => {
          if (document.body.innerText.includes('Weekly Stats Snapshot')) {
            resolve(performance.now() - start);
          } else if (performance.now() - start > 5000) {
            reject(new Error('Weekly Review second nav timeout after 5s'));
          } else {
            setTimeout(check, 2);
          }
        };
        check();
      });
    });

    console.log(`  - Second transition to Review took: ${secondReviewTime.toFixed(1)}ms`);

    if (secondReviewTime > 150) {
      throw new Error(`Perceived transition time (${secondReviewTime.toFixed(1)}ms) exceeded the 150ms latency budget! Client router cache not working.`);
    }
    console.log('✓ Cache-hit navigation latency is well within the 150ms budget.');

    // ----------------------------------------------------
    // Test 4: Second Navigation back to Dashboard (Cache-hit / SWR)
    // ----------------------------------------------------
    console.log('\n[Test 4] Navigating back to Dashboard second time (expecting instant transition from Router Cache)...');
    const secondDashTime = await page.evaluate(async () => {
      const start = performance.now();
      const link = document.querySelector('a[href="/"]') as HTMLElement;
      if (!link) throw new Error('Dashboard sidebar link not found');
      link.click();
      
      return new Promise<number>((resolve, reject) => {
        const check = () => {
          if (document.body.innerText.includes('Recovery Score')) {
            resolve(performance.now() - start);
          } else if (performance.now() - start > 5000) {
            reject(new Error('Dashboard second nav timeout after 5s'));
          } else {
            setTimeout(check, 2);
          }
        };
        check();
      });
    });

    console.log(`  - Second transition back to Dashboard took: ${secondDashTime.toFixed(1)}ms`);

    if (secondDashTime > 150) {
      throw new Error(`Perceived transition time back to Dashboard (${secondDashTime.toFixed(1)}ms) exceeded the 150ms budget!`);
    }
    console.log('✓ Dashboard cache-hit navigation latency is well within the 150ms budget.');

    console.log('\n--- ALL NAVIGATION LATENCY TESTS PASSED SUCCESSFULLY ---');

  } finally {
    await browser.close();
  }
}

async function main() {
  console.log('Starting Next.js production server for latency tests...');
  
  const server = spawn('npx', ['next', 'start', '-p', String(TEST_PORT)], {
    stdio: 'ignore',
    shell: true,
  });

  let success = false;
  try {
    const isReady = await waitForServer(server);
    if (!isReady) {
      throw new Error('Failed to start Next.js production server.');
    }
    
    await runLatencyTests();
    success = true;
  } catch (error) {
    console.error('\n❌ Latency check failed!');
    console.error(error);
  } finally {
    console.log('\nTearing down Next.js production server...');
    server.kill('SIGTERM');
    process.exit(success ? 0 : 1);
  }
}

main();
