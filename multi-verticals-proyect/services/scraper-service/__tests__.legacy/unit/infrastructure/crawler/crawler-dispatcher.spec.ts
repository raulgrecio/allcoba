import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chromium } from 'patchright';

import type { CaptchaSolver } from '#application/ports/captcha-solver.port.js';
import type { ProxyProvider } from '#application/ports/proxy-provider.port.js';
import { CrawlerDispatcher } from '#infrastructure/crawler/crawler-dispatcher.js';

describe('Unit: CrawlerDispatcher', () => {
  let dispatcher: CrawlerDispatcher;
  let mockCrawler: any;
  let mockRobotsChecker: any;

  beforeEach(() => {
    dispatcher = new CrawlerDispatcher({} as CaptchaSolver, {} as ProxyProvider);

    // Accedemos a las instancias privadas para mockearlas
    mockCrawler = {
      fetch: vi.fn().mockResolvedValue({ html: 'html' }),
      close: vi.fn().mockResolvedValue(undefined),
    };
    mockRobotsChecker = {
      isAllowed: vi.fn().mockResolvedValue(true),
    };

    (dispatcher as any).crawler = mockCrawler;
    (dispatcher as any).robotsChecker = mockRobotsChecker;
  });

  it('debería delegar el fetch al motor único', async () => {
    const result = await dispatcher.fetch('https://example.com');
    expect(mockCrawler.fetch).toHaveBeenCalled();
    expect(result.html).toBe('html');
  });

  it('debería usar robotsChecker para isAllowed', async () => {
    await dispatcher.isAllowed('https://example.com');
    expect(mockRobotsChecker.isAllowed).toHaveBeenCalledWith('https://example.com');
  });

  it('debería cerrar el motor al cerrar el dispatcher', async () => {
    await dispatcher.close();
    expect(mockCrawler.close).toHaveBeenCalled();
  });
});
