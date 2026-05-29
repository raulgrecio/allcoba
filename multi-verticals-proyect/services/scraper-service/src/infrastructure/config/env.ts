import { z } from 'zod';

import type { CrawlerEngine } from '#application/ports/crawler.port.js';

export interface ScraperConfig {
  readonly logLevel: string;
  readonly nodeEnv: string;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly databaseUrl?: string;
  readonly mediaServiceUrl: string;
  readonly storagePath: string;
  readonly scraperStorage: 'json' | 'postgres';
  readonly crawlerMaxConcurrent: number;
  readonly crawlerEngine: CrawlerEngine;
  readonly zyteApiKey?: string;
  readonly capsolverApiKey?: string;
  readonly crawlerBlockImages: boolean;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string().url().optional(),
  MEDIA_SERVICE_URL: z.string().url().default('http://localhost:3002'),
  STORAGE_PATH: z.string().default('storage'),
  SCRAPER_STORAGE: z.enum(['json', 'postgres']).default('json'),
  CRAWLER_MAX_CONCURRENT: z.coerce.number().int().min(1).max(10).default(3),
  CRAWLER_ENGINE: z.enum(['playwright', 'patchright', 'static'] as const).default('patchright'),
  ZYTE_API_KEY: z.string().optional(),
  CAPSOLVER_API_KEY: z.string().optional(),
  CRAWLER_BLOCK_IMAGES: z
    .preprocess((val) => val === 'true' || val === '1', z.boolean())
    .default(false),
});

export function parseConfig(env: NodeJS.ProcessEnv): ScraperConfig {
  const parsed = envSchema.parse(env);

  return {
    nodeEnv: parsed.NODE_ENV,
    logLevel: parsed.LOG_LEVEL,
    isProduction: parsed.NODE_ENV === 'production',
    isDevelopment: parsed.NODE_ENV === 'development',
    databaseUrl: parsed.DATABASE_URL,
    mediaServiceUrl: parsed.MEDIA_SERVICE_URL,
    storagePath: parsed.STORAGE_PATH,
    scraperStorage: parsed.SCRAPER_STORAGE,
    crawlerMaxConcurrent: parsed.CRAWLER_MAX_CONCURRENT,
    crawlerEngine: parsed.CRAWLER_ENGINE,
    zyteApiKey: parsed.ZYTE_API_KEY,
    capsolverApiKey: parsed.CAPSOLVER_API_KEY,
    crawlerBlockImages: parsed.CRAWLER_BLOCK_IMAGES,
  };
}

let _config: ScraperConfig | undefined;

export const config: ScraperConfig = new Proxy({} as ScraperConfig, {
  get(_target, prop) {
    if (!_config) {
      _config = parseConfig(process.env);
    }
    return _config[prop as keyof ScraperConfig];
  },
});
