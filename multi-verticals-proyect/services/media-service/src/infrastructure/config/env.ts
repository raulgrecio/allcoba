import { z } from 'zod';

export interface MediaConfig {
  readonly port: number;
  readonly logLevel: string;
  readonly nodeEnv: string;
  readonly isProduction: boolean;
  readonly isDevelopment: boolean;
  readonly ocrEnabled: boolean;
  readonly databaseUrl?: string;
  readonly queueEnabled: boolean;
}

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3002),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  OCR_ENABLED: z.preprocess((val) => val === 'true' || val === '1', z.boolean()).default(false),
  DATABASE_URL: z.string().optional(),
  QUEUE_ENABLED: z.preprocess((val) => val === 'true' || val === '1', z.boolean()).default(false),
});

export function parseConfig(env: NodeJS.ProcessEnv): MediaConfig {
  const parsed = envSchema.parse(env);

  return {
    port: parsed.PORT,
    nodeEnv: parsed.NODE_ENV,
    logLevel: parsed.LOG_LEVEL,
    isProduction: parsed.NODE_ENV === 'production',
    isDevelopment: parsed.NODE_ENV === 'development',
    ocrEnabled: parsed.OCR_ENABLED,
    databaseUrl: parsed.DATABASE_URL,
    queueEnabled: parsed.QUEUE_ENABLED,
  };
}

let _config: MediaConfig | undefined;

export const config: MediaConfig = new Proxy({} as MediaConfig, {
  get(_target, prop) {
    if (!_config) {
      _config = parseConfig(process.env);
    }
    return _config[prop as keyof MediaConfig];
  },
});
