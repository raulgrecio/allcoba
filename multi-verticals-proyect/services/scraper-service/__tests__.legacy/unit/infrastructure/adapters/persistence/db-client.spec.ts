import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Unit: db-client', () => {
  beforeEach(() => {
    vi.resetModules();

    vi.doMock('postgres', () => ({
      default: vi.fn(() => {
        const mockClient = vi.fn().mockResolvedValue([]);
        return mockClient;
      }),
    }));

    vi.doMock('drizzle-orm/postgres-js', () => ({
      drizzle: vi.fn(() => ({})),
    }));
  });

  it('initializes drizzle when databaseUrl is present', async () => {
    vi.doMock('#infrastructure/config/env.js', () => ({
      config: {
        databaseUrl: 'postgres://user:pass@localhost:5432/db',
      },
    }));

    const { db } = await import('#infrastructure/adapters/persistence/db-client.js');
    expect(db).toBeDefined();
  });

  it('throws error when databaseUrl is missing', async () => {
    vi.doMock('#infrastructure/config/env.js', () => ({
      config: { databaseUrl: undefined },
    }));

    await expect(import('#infrastructure/adapters/persistence/db-client.js')).rejects.toThrow(
      'DATABASE_URL is not defined in config',
    );
  });
});
