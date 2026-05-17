import { chromium as patchright } from 'patchright';
import { chromium as playwright } from 'playwright-core';

import type { CaptchaSolver } from '#application/ports/captcha-solver.port.js';
import type { CrawlerOptions, CrawlerPort, CrawlResult } from '#application/ports/crawler.port.js';
import type { ProxyProvider } from '#application/ports/proxy-provider.port.js';
import { CrawlerEngine } from '#application/ports/crawler.port.js';
import { config } from '#infrastructure/config/env.js';

import { CheerioCrawler } from './engines/cheerio.crawler.js';
import { ChromiumCrawler } from './engines/chromium.crawler.js';
import { RobotsChecker } from './robots-checker.js';

/**
 * Unified crawler that delegates to specific engines (Standard Playwright or Patchright)
 * based on the requested options.
 */
export class CrawlerDispatcher implements CrawlerPort {
  private readonly crawler: CrawlerPort;
  private readonly robotsChecker = new RobotsChecker();

  constructor(
    captchaSolver: CaptchaSolver,
    proxyProvider: ProxyProvider,
    engineType: CrawlerEngine = CrawlerEngine.PATCHRIGHT,
    maxConcurrent: number = 3,
  ) {
    if (engineType === CrawlerEngine.STATIC) {
      this.crawler = new CheerioCrawler(captchaSolver, proxyProvider, maxConcurrent);
    } else {
      const engine = engineType === CrawlerEngine.PATCHRIGHT ? patchright : playwright;
      this.crawler = new ChromiumCrawler(
        engine,
        engineType,
        captchaSolver,
        proxyProvider,
        maxConcurrent,
      );
    }
  }

  async fetch(url: string, options: CrawlerOptions = {}): Promise<CrawlResult> {
    const mergedOptions = {
      blockImages: config.crawlerBlockImages,
      ...options,
    };
    return this.crawler.fetch(url, mergedOptions);
  }

  async isAllowed(url: string): Promise<boolean> {
    return this.robotsChecker.isAllowed(url);
  }

  async close(): Promise<void> {
    await this.crawler.close();
  }
}
