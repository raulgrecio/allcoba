/**
 * Test PG helper — spins a Testcontainers postgres:16-alpine, applies the
 * minimal DDL needed by the scraper repos, and returns a drizzle handle.
 *
 * Each test that needs PG calls `setupTestDb()` in `beforeAll` and
 * `cleanup()` in `afterAll`. Avoid sharing containers across files: vitest
 * runs files in separate workers (`pool: 'forks'`), so a per-file container
 * is the easiest correct default.
 */

import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';

import * as schema from '#infrastructure/adapters/persistence/schema/scraper.schema.js';

export interface TestDb {
  readonly container: StartedPostgreSqlContainer;
  readonly db: PostgresJsDatabase<typeof schema>;
  readonly client: ReturnType<typeof postgres>;
  cleanup(): Promise<void>;
}

const CREATE_DATING = sql`
  CREATE TABLE IF NOT EXISTS scraped_dating (
    id uuid PRIMARY KEY,
    vertical text NOT NULL,
    phone_number text,
    email text,
    external_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
    image_hashes jsonb NOT NULL DEFAULT '[]'::jsonb,
    confidence real NOT NULL DEFAULT 0,
    last_scraped_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    data jsonb NOT NULL
  )
`;

const CREATE_RAW = sql`
  CREATE TABLE IF NOT EXISTS scraped_raw (
    source text NOT NULL,
    source_id text NOT NULL,
    source_url text,
    payload jsonb NOT NULL,
    captured_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (source, source_id)
  )
`;

export const setupTestDb = async (): Promise<TestDb> => {
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withUsername('test')
    .withPassword('test')
    .withDatabase('scraper_test')
    .start();

  const client = postgres(container.getConnectionUri(), { max: 4 });
  const db = drizzle(client, { schema });

  await db.execute(CREATE_DATING);
  await db.execute(CREATE_RAW);

  const cleanup = async (): Promise<void> => {
    await client.end({ timeout: 5 });
    await container.stop();
  };

  return { container, db, client, cleanup };
};

/** Wipe all rows from both scraper tables — call between tests in a suite. */
export const truncateAll = async (db: PostgresJsDatabase<typeof schema>): Promise<void> => {
  await db.execute(sql`TRUNCATE scraped_dating, scraped_raw`);
};
