import { describe, expect, it } from 'vitest';

import { parseConfig } from '#infrastructure/config/env.js';

describe('Config', () => {
  it('parses valid environment variables', () => {
    const env = {
      NODE_ENV: 'production',
      LOG_LEVEL: 'debug',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      STORAGE_PATH: '/tmp/storage',
    };

    const config = parseConfig(env);

    expect(config.nodeEnv).toBe('production');
    expect(config.logLevel).toBe('debug');
    expect(config.isProduction).toBe(true);
    expect(config.databaseUrl).toBe('postgresql://user:pass@localhost:5432/db');
    expect(config.storagePath).toBe('/tmp/storage');
  });

  it('uses default values when optional variables are missing', () => {
    const env = {
      DATABASE_URL: 'postgresql://localhost:5432/db',
    };

    const config = parseConfig(env);

    expect(config.nodeEnv).toBe('development');
    expect(config.logLevel).toBe('info');
    expect(config.storagePath).toBe('storage');
  });

  it('throws error when invalid enum values are provided', () => {
    const env = { NODE_ENV: 'invalid-env' };
    expect(() => parseConfig(env as any)).toThrow();
  });

  it('throws error for invalid database URL', () => {
    const env = {
      DATABASE_URL: 'not-a-url',
    };
    expect(() => parseConfig(env)).toThrow();
  });
});
