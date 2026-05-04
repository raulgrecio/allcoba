import * as cheerio from 'cheerio';

import { logger } from '@allcoba/kernel';

export interface CrawlerOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

export class CheerioCrawler {
  async fetch(url: string, options: CrawlerOptions = {}): Promise<cheerio.CheerioAPI> {
    const timeout = options.timeout || 10000;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ...options.headers,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Error al descargar ${url}: ${response.statusText}`);
      }

      const html = await response.text();
      return cheerio.load(html);
    } catch (error: any) {
      logger().error(
        {
          error: {
            message: error.message,
            stack: error.stack,
            cause: error.cause,
          },
          url,
        },
        'Error en CheerioCrawler',
      );
      throw error;
    } finally {
      clearTimeout(id);
    }
  }
}
