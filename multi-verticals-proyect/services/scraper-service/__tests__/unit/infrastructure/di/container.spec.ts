import { describe, expect, it, vi } from 'vitest';

import { createScraperServices } from '#infrastructure/di/container.js';

vi.mock('#infrastructure/config/env.js', () => ({
  config: {
    capsolverApiKey: 'test-key',
    zyteApiKey: 'test-key',
    crawlerMaxConcurrent: 3,
    databaseUrl: 'postgres://localhost:5432/test',
  },
}));

describe('Unit: DI Container', () => {
  it('creates all scraper services with the provided config', async () => {
    const config = {
      maxImagesToProcess: 10,
      saveRawHtml: true,
    };

    const services = await createScraperServices(config);

    expect(services.scrapeUrlUseCase).toBeDefined();
    expect(services.discoverUrlsUseCase).toBeDefined();

    // Check if config is correctly passed to ScrapeUrlUseCase
    expect(services.scrapeUrlUseCase['config']).toEqual(
      expect.objectContaining({
        maxImagesToProcess: 10,
        saveRawHtml: true,
      }),
    );
  });
});
