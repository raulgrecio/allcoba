import { execSync } from 'node:child_process';
import { chromium as patchright } from 'patchright';
import { chromium as playwright } from 'playwright-core';

interface BrowserEngine {
  launch(options: { headless: boolean }): Promise<{
    newContext(): Promise<{
      newPage(): Promise<{ goto(url: string, opts: Record<string, unknown>): Promise<unknown> }>;
    }>;
    close(): Promise<void>;
  }>;
  executablePath(): string;
}

async function getBrowserMemory(execPath: string): Promise<number> {
  try {
    const binName = execPath.split('/').pop();
    const psOutput = execSync(`ps aux | grep "${binName}" | grep -v grep`).toString();
    const lines = psOutput.trim().split('\n');
    let totalRSS = 0;
    lines.forEach((line) => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 6 || !parts[5]) return;
      const rss = parseInt(parts[5], 10);
      if (!isNaN(rss)) totalRSS += rss;
    });
    return totalRSS / 1024; // MB
  } catch {
    return 0;
  }
}

async function runMeasurement(engine: BrowserEngine, name: string) {
  console.log(`\n--- Midiendo ${name} ---`);

  const browser = await engine.launch({ headless: true });
  const execPath = engine.executablePath();

  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded' });

  const nodeMem = process.memoryUsage().rss / 1024 / 1024;
  const browserMem = await getBrowserMemory(execPath);

  await browser.close();

  return { nodeMem, browserMem };
}

async function compare() {
  console.log('Iniciando comparación de recursos...');

  const playwrightResults = await runMeasurement(playwright, 'Playwright (Standard)');
  const patchrightResults = await runMeasurement(patchright, 'Patchright (Stealth)');

  console.log('\n================================================');
  console.log('       RESULTADOS DE LA COMPARACIÓN');
  console.log('================================================');
  console.log(`MOTOR         | NODE RAM   | BROWSER RAM | TOTAL`);
  console.log(`--------------|------------|-------------|-------`);
  console.log(
    `Playwright    | ${playwrightResults.nodeMem.toFixed(2)} MB  | ${playwrightResults.browserMem.toFixed(2)} MB   | ${(playwrightResults.nodeMem + playwrightResults.browserMem).toFixed(2)} MB`,
  );
  console.log(
    `Patchright    | ${patchrightResults.nodeMem.toFixed(2)} MB  | ${patchrightResults.browserMem.toFixed(2)} MB   | ${(patchrightResults.nodeMem + patchrightResults.browserMem).toFixed(2)} MB`,
  );
  console.log('================================================');

  const diff =
    patchrightResults.nodeMem +
    patchrightResults.browserMem -
    (playwrightResults.nodeMem + playwrightResults.browserMem);
  console.log(`Diferencia: ${diff > 0 ? '+' : ''}${diff.toFixed(2)} MB para Patchright`);
}

compare().catch(console.error);
