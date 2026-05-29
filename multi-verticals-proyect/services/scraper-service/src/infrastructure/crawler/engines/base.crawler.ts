import * as fs from 'node:fs';
import * as path from 'node:path';
import type { BrowserContext, Page } from 'playwright-core';

import { logger } from '@allcoba/kernel';

import type { CaptchaSolver } from '#application/ports/captcha-solver.port.js';
import type { CrawlerOptions, CrawlerPort, CrawlResult } from '#application/ports/crawler.port.js';
import type { ProxyProvider } from '#application/ports/proxy-provider.port.js';

import { RobotsChecker } from '../robots-checker.js';
import { handleCloudflareChallenge, waitForCloudflareClear } from '../utils/human-interactions.js';

export abstract class BaseCrawler implements CrawlerPort {
  protected static readonly COOKIES_DIR = path.resolve('__data', 'cookies');
  protected static readonly PROFILES_DIR = path.join(process.cwd(), '__data/profiles');
  protected readonly robotsChecker = new RobotsChecker();
  protected readonly semaphore: Semaphore;
  protected cachedOutboundIp?: string;
  protected readonly domainContexts = new Map<string, BrowserContext>();

  protected static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  ];

  protected static readonly VIEWPORTS = [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 1536, height: 864 },
    { width: 1440, height: 900 },
  ];

  constructor(
    protected readonly captchaSolver: CaptchaSolver,
    protected readonly proxyProvider: ProxyProvider,
    maxConcurrent: number = 3,
  ) {
    this.semaphore = new Semaphore(maxConcurrent);
    if (!fs.existsSync(BaseCrawler.PROFILES_DIR)) {
      fs.mkdirSync(BaseCrawler.PROFILES_DIR, { recursive: true });
    }
  }

  abstract fetch(url: string, options?: CrawlerOptions): Promise<CrawlResult>;

  async isAllowed(url: string): Promise<boolean> {
    return this.robotsChecker.isAllowed(url);
  }

  protected getRandomUA(): string {
    return BaseCrawler.USER_AGENTS[Math.floor(Math.random() * BaseCrawler.USER_AGENTS.length)]!;
  }

  protected getRandomViewport() {
    return BaseCrawler.VIEWPORTS[Math.floor(Math.random() * BaseCrawler.VIEWPORTS.length)]!;
  }

  protected async resolveOutboundIp(): Promise<string | undefined> {
    if (this.cachedOutboundIp) return this.cachedOutboundIp;
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = (await res.json()) as { ip: string };
      this.cachedOutboundIp = data.ip;
    } catch {
      logger().warn('No se pudo obtener la IP de salida');
    }
    return this.cachedOutboundIp;
  }

  protected async handleSecurity(page: Page, options: CrawlerOptions): Promise<void> {
    const content = await page.content();
    const hasCF =
      content.includes('challenges.cloudflare.com') ||
      content.includes('Un momento…') ||
      content.includes('Just a moment...') ||
      content.includes('Verify you are human');

    if (!hasCF) return;

    // Estrategia 1: Captcha Solver (Abstraído)
    if (options.solverStrategy !== 'none') {
      logger().warn('Cloudflare detectado. Intentando resolución automática...');
      const success = await this.captchaSolver.solve(page);
      if (success) {
        await waitForCloudflareClear(page, 20000);
        return;
      }
    }

    // Estrategia 2: Interacción Humana Automática (Auto-clic, etc.)
    logger().warn('Cloudflare detectado. Intentando interacción automática...');
    await handleCloudflareChallenge(page, { headless: options.headless });
  }

  protected async handleCookies(page: Page, selectors?: string[]): Promise<void> {
    if (!selectors || selectors.length === 0) return;
    for (const selector of selectors) {
      try {
        const locator = page.locator(selector).first();
        if (await locator.isVisible()) {
          logger().info({ selector }, 'Aceptando cookies');
          await locator.click();
          await this.randomWait(500, 1000);
        }
      } catch {
        /* ignore */
      }
    }
  }

  protected async randomWait(min: number = 1000, max: number = 3000): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected async simulateHumanScroll(page: Page): Promise<void> {
    await page.evaluate(async () => {
      const scrollHeight = document.body.scrollHeight;
      const step = 200;
      for (let i = 0; i < scrollHeight; i += step) {
        window.scrollTo(0, i);
        await new Promise((res) => setTimeout(res, 50));
      }
    });
  }

  abstract close(): Promise<void>;
}

class Semaphore {
  private count: number;
  private readonly queue: Array<() => void> = [];
  constructor(max: number) {
    this.count = max;
  }
  acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--;
      return Promise.resolve();
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }
  release(): void {
    if (this.queue.length > 0) {
      this.queue.shift()!();
    } else {
      this.count++;
    }
  }
}
