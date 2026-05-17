import { logger } from '@allcoba/kernel';

import type { CrawlerOptions, CrawlResult } from '#application/ports/crawler.port.js';

import { BaseCrawler } from './base.crawler.js';

export class CheerioCrawler extends BaseCrawler {
  async fetch(url: string, options: CrawlerOptions = {}): Promise<CrawlResult> {
    const timeout = options.timeout || 10000;
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeout);

    const userAgent = this.getRandomUA();
    const outboundIp = await this.resolveOutboundIp();

    await this.semaphore.acquire();
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': userAgent,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Error al descargar ${url}: ${response.statusText}`);
      }

      const html = await response.text();
      clearTimeout(timerId);

      return {
        html,
        userAgent,
        status: response.status,
        serverIp: outboundIp,
      };
    } catch (error: any) {
      clearTimeout(timerId);
      logger().error(
        {
          error: {
            message: error.message,
            stack: error.stack,
          },
          url,
        },
        'Error en StaticCrawler',
      );
      throw error;
    } finally {
      this.semaphore.release();
    }
  }

  async close(): Promise<void> {
    // No necesita limpieza especial
  }
}
