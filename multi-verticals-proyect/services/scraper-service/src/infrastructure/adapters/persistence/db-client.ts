import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { config } from '#infrastructure/config/env.js';

import * as schema from './schema/scraper.schema.js';

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is not defined in config');
}

const client = postgres(config.databaseUrl);
export const db = drizzle(client, { schema });
