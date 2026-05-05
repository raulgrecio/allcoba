import { z } from 'zod';

export interface ScraperConfig {
  readonly logLevel: string;
  readonly nodeEnv: string;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly databaseUrl: string;
  readonly storagePath: string;
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  DATABASE_URL: z.string().url(),
  STORAGE_PATH: z.string().default('storage'),
});

export function parseConfig(env: NodeJS.ProcessEnv): ScraperConfig {
  const parsed = envSchema.parse(env);

  return {
    nodeEnv: parsed.NODE_ENV,
    logLevel: parsed.LOG_LEVEL,
    isProduction: parsed.NODE_ENV === 'production',
    isDevelopment: parsed.NODE_ENV === 'development',
    databaseUrl: parsed.DATABASE_URL,
    storagePath: parsed.STORAGE_PATH,
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
