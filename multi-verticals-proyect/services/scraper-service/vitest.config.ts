import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    conditions: ['source'],
  },
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    isolate: true,
    exclude: ['**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        // default
        'src/index.ts',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/node_modules/**',

        // Browser automation — requires Playwright/Patchright
        'src/infrastructure/crawler/**',

        // DI wiring + env config — no unit-test value
        'src/infrastructure/di/**',
        'src/infrastructure/config/**',

        // External-API adapters — need live credentials
        'src/infrastructure/adapters/captcha/**',
        'src/infrastructure/adapters/proxy/**',
        'src/infrastructure/adapters/queue/**',

        // Storage / image adapters — need filesystem or cloud
        'src/infrastructure/adapters/storage/**',
        'src/infrastructure/adapters/images/**',

        // DB-dependent persistence adapters
        'src/infrastructure/adapters/persistence/db-client.ts',
        'src/infrastructure/adapters/persistence/postgres-provider.repository.ts',
        'src/infrastructure/adapters/persistence/drizzle-provider.repository.ts',
        'src/infrastructure/adapters/persistence/drizzle-scraped-entity.repository.ts',
        'src/infrastructure/adapters/persistence/json-file-provider.repository.ts',
        'src/infrastructure/adapters/persistence/raw/json-file-raw.repository.ts',
        'src/infrastructure/adapters/persistence/raw/drizzle-raw.repository.ts',
        'src/infrastructure/adapters/persistence/schema/scraper.schema.ts',
        'src/infrastructure/adapters/persistence/schema/catalog.schema.ts',

        // BaseSourceAdapter + catch-all DiscoveryAdapter — delegate to real crawler
        'src/infrastructure/adapters/sources/base-source.adapter.ts',
        'src/infrastructure/adapters/sources/general/discovery.adapter.ts',

        // Pure type-declaration files — import-only, no business logic
        'src/domain/canonical/index.ts',
        'src/domain/canonical/scraped-provider.ts',
        'src/domain/canonical/scraped-property.ts',
        'src/domain/canonical/scraped-vehicle.ts',
        'src/domain/canonical/scraped-listing.ts',
        'src/domain/canonical/profile-image.ts',
        'src/infrastructure/adapters/sources/dating/topescortbabes/topescortbabes.types.ts',

        // DB-dependent catalog adapter — requires live Postgres
        'src/infrastructure/adapters/catalog/drizzle-taxonomy-resolver.ts',
      ],
      thresholds: {
        perFile: true,
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
