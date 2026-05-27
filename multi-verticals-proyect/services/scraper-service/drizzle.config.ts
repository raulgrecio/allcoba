import { defineConfig } from 'drizzle-kit';

import { config } from '#infrastructure/config/env.js';

if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

export default defineConfig({
  schema: './src/infrastructure/adapters/persistence/postgres/schema/scraper.schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: config.databaseUrl,
  },
});
