import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { logger } from '@allcoba/kernel';

import { config } from '#infrastructure/config/env.js';

import * as schema from './schema/scraper.schema.js';

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is not defined in config');
}

const client = postgres(config.databaseUrl, {
  onparameter: (name, value) => {
    if (name === 'search_path' && value !== 'scraper, public') {
      // This is just for debugging
    }
  },
});

// We can also run a SET search_path after connection
export const db = drizzle(client, { schema });

export async function checkConnection(): Promise<void> {
  try {
    await db.execute(sql`SELECT 1`);
    logger().info('DB connection OK');
  } catch (err) {
    logger().error(
      { err: err instanceof Error ? err.message : String(err) },
      'DB connection FAILED — verify DATABASE_URL and Postgres is running',
    );
    throw err;
  }
}

// Try to set search path for this session
await client`SET search_path TO scraper, public`.catch((err) =>
  logger().error('Failed to set search_path:', err),
);
