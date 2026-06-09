import { spawn, ChildProcess } from 'child_process';
import puppeteer, { Page } from 'puppeteer-core';
import fs from 'fs';
import { execSync } from 'child_process';

const TEST_PORT = 3006;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Find Chrome/Chromium path on the system
function findChromePath(): string | null {
  const commonPaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/bin/chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const path of commonPaths) {
    if (fs.existsSync(path)) {
      return path;
    }
  }

  // Try checking path using which/where command
  try {
    const whichCmd = process.platform === 'win32' ? 'where chrome' : 'which google-chrome || which chromium-browser || which chromium || which chrome';
    const whichPath = execSync(whichCmd, { stdio: 'pipe' }).toString().trim().split('\n')[0];
    if (whichPath && fs.existsSync(whichPath)) {
      return whichPath;
    }
  } catch {
    // Ignore error
  }

  return null;
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

async function startDOMObserver(page: Page) {
  await page.evaluate(`(() => {
    const win = window;
    win.__loadingDetected = false;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node;
            
            // Check if this element or any child matches loader criteria
            const hasSpinner = el.classList?.contains('animate-spin') || 
                               (el.querySelector && el.querySelector('.animate-spin'));
            const hasText = el.innerText && el.innerText.toUpperCase().includes('LOADING');
            
            if (hasSpinner || hasText) {
              win.__loadingDetected = true;
            }
          }
        }
      }
    });
    win.__domObserver = observer;
    observer.observe(document.body, { childList: true, subtree: true });
  })()`);
}

async function stopDOMObserver(page: Page): Promise<boolean> {
  const result = await page.evaluate(`(() => {
    const win = window;
    const observer = win.__domObserver;
    if (observer) {
      observer.disconnect();
    }
    const detected = win.__loadingDetected;
    delete win.__domObserver;
    delete win.__loadingDetected;
    return !!detected;
  })()`);
  return !!result;
}

async function runLatencyTests() {
  console.log('--- STARTING NAVIGATION LATENCY VERIFICATION TESTS ---');
  
  const chromePath = findChromePath();
  if (!chromePath) {
    console.warn('\n⚠️ [SKIPPED] No Google Chrome or Chromium executable found on this system.');
    console.warn('Skipping navigation navigation latency verification tests.');
    return;
  }

  console.log(`Using Chrome/Chromium executable at: ${chromePath}`);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
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

    // Wait a brief moment to let Next.js prefetching finish (since prefetching happens as links enter the viewport)
    console.log('Waiting 1.5s for Next.js background prefetching to complete...');
    await wait(1500);

    // ----------------------------------------------------
    // Test 1: First Navigation to Review (Prefetched)
    // ----------------------------------------------------
    console.log('\n[Test 1] Navigating to Weekly Review (prefetched, expecting instant transition)...');
    
    await startDOMObserver(page);
    
    const firstReviewTime = await page.evaluate(`(async () => {
      const start = performance.now();
      const link = document.querySelector('a[href="/review"]');
      if (!link) throw new Error('Weekly Review sidebar link not found');
      link.click();
      
      return new Promise((resolve, reject) => {
        const check = () => {
          if (document.body.innerText.toLowerCase().includes('weekly stats snapshot')) {
            resolve(performance.now() - start);
          } else if (performance.now() - start > 10000) {
            reject(new Error('Weekly Review first nav timeout after 10s. Current body text: ' + document.body.innerText.substring(0, 1000)));
          } else {
            setTimeout(check, 5);
          }
        };
        check();
      });
    })()`) as number;

    const loadingDetectedDuringTest1 = await stopDOMObserver(page);
    console.log(`  - Transition to Review took: ${firstReviewTime.toFixed(1)}ms`);
    console.log(`  - loading.tsx / Spinner detected: ${loadingDetectedDuringTest1 ? 'YES ❌' : 'NO  ✓'}`);

    if (loadingDetectedDuringTest1) {
      throw new Error('Visual interruption: loading.tsx skeleton/spinner was rendered during transition to Review!');
    }
    if (firstReviewTime > 150) {
      throw new Error(`First transition time to Review (${firstReviewTime.toFixed(1)}ms) exceeded the 150ms budget!`);
    }
    console.log('✓ Prefetched navigation is instant and did NOT trigger any loader flash.');

    // ----------------------------------------------------
    // Test 2: Navigate back to Dashboard (Prefetched)
    // ----------------------------------------------------
    console.log('\n[Test 2] Navigating back to Dashboard (expecting instant transition)...');
    
    await startDOMObserver(page);
    
    const firstDashTime = await page.evaluate(`(async () => {
      const start = performance.now();
      const link = document.querySelector('a[href="/"]');
      if (!link) throw new Error('Dashboard sidebar link not found');
      link.click();
      
      return new Promise((resolve, reject) => {
        const check = () => {
          if (document.body.innerText.toLowerCase().includes('recovery score')) {
            resolve(performance.now() - start);
          } else if (performance.now() - start > 10000) {
            reject(new Error('Dashboard first nav timeout after 10s. Current body text: ' + document.body.innerText.substring(0, 1000)));
          } else {
            setTimeout(check, 5);
          }
        };
        check();
      });
    })()`) as number;

    const loadingDetectedDuringTest2 = await stopDOMObserver(page);
    console.log(`  - Transition back to Dashboard took: ${firstDashTime.toFixed(1)}ms`);
    console.log(`  - loading.tsx / Spinner detected: ${loadingDetectedDuringTest2 ? 'YES ❌' : 'NO  ✓'}`);

    if (loadingDetectedDuringTest2) {
      throw new Error('Visual interruption: loading.tsx skeleton/spinner was rendered during transition back to Dashboard!');
    }
    if (firstDashTime > 150) {
      throw new Error(`Transition back to Dashboard (${firstDashTime.toFixed(1)}ms) exceeded the 150ms budget!`);
    }
    console.log('✓ Navigation back to Dashboard is instant and did NOT trigger any loader flash.');

    // ----------------------------------------------------
    // Test 3: Navigate to Workout (Prefetched)
    // ----------------------------------------------------
    console.log('\n[Test 3] Navigating to Workout page (expecting instant transition)...');
    
    await startDOMObserver(page);
    
    const firstWorkoutTime = await page.evaluate(`(async () => {
      const start = performance.now();
      const link = document.querySelector('a[href="/workout"]');
      if (!link) throw new Error('Workout sidebar link not found');
      link.click();
      
      return new Promise((resolve, reject) => {
        const check = () => {
          if (document.body.innerText.toLowerCase().includes('workout logger')) {
            resolve(performance.now() - start);
          } else if (performance.now() - start > 10000) {
            reject(new Error('Workout first nav timeout after 10s. Current body text: ' + document.body.innerText.substring(0, 1000)));
          } else {
            setTimeout(check, 5);
          }
        };
        check();
      });
    })()`) as number;

    const loadingDetectedDuringTest3 = await stopDOMObserver(page);
    console.log(`  - Transition to Workout took: ${firstWorkoutTime.toFixed(1)}ms`);
    console.log(`  - loading.tsx / Spinner detected: ${loadingDetectedDuringTest3 ? 'YES ❌' : 'NO  ✓'}`);

    if (loadingDetectedDuringTest3) {
      throw new Error('Visual interruption: loading.tsx skeleton/spinner was rendered during transition to Workout!');
    }
    if (firstWorkoutTime > 150) {
      throw new Error(`Transition to Workout (${firstWorkoutTime.toFixed(1)}ms) exceeded the 150ms budget!`);
    }
    console.log('✓ Navigation to Workout is instant and did NOT trigger any loader flash.');

    // ----------------------------------------------------
    // Test 4: Navigate back to Dashboard from Workout
    // ----------------------------------------------------
    console.log('\n[Test 4] Navigating back to Dashboard from Workout...');
    
    await startDOMObserver(page);
    
    const secondDashTime = await page.evaluate(`(async () => {
      const start = performance.now();
      const link = document.querySelector('a[href="/"]');
      if (!link) throw new Error('Dashboard sidebar link not found');
      link.click();
      
      return new Promise((resolve, reject) => {
        const check = () => {
          if (document.body.innerText.toLowerCase().includes('recovery score')) {
            resolve(performance.now() - start);
          } else if (performance.now() - start > 10000) {
            reject(new Error('Dashboard second nav timeout after 10s. Current body text: ' + document.body.innerText.substring(0, 1000)));
          } else {
            setTimeout(check, 5);
          }
        };
        check();
      });
    })()`) as number;

    const loadingDetectedDuringTest4 = await stopDOMObserver(page);
    console.log(`  - Transition back to Dashboard took: ${secondDashTime.toFixed(1)}ms`);
    console.log(`  - loading.tsx / Spinner detected: ${loadingDetectedDuringTest4 ? 'YES ❌' : 'NO  ✓'}`);

    if (loadingDetectedDuringTest4) {
      throw new Error('Visual interruption: loading.tsx skeleton/spinner was rendered during second transition back to Dashboard!');
    }
    if (secondDashTime > 150) {
      throw new Error(`Second transition back to Dashboard (${secondDashTime.toFixed(1)}ms) exceeded the 150ms budget!`);
    }
    console.log('✓ All navigation transitions avoid the loader flash completely and load instantly.');

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
