import * as fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CaptchaSolver } from '#application/ports/captcha-solver.port.js';
import type { CrawlerOptions, CrawlResult } from '#application/ports/crawler.port.js';
import type { ProxyProvider } from '#application/ports/proxy-provider.port.js';
import { BaseCrawler } from '#infrastructure/crawler/engines/base.crawler.js';

// Clase mínima para testear la base abstracta
class TestCrawler extends BaseCrawler {
  async fetch(url: string, options?: CrawlerOptions): Promise<CrawlResult> {
    return { html: '', status: 200, userAgent: '' };
  }
  async close(): Promise<void> {}

  // Exponemos métodos protegidos para testing
  public async testResolveIp() {
    return this.resolveOutboundIp();
  }
  public async testHandleCookies(page: any, selectors?: string[]) {
    return this.handleCookies(page, selectors);
  }
  public async testRandomWait(min: number, max: number) {
    return this.randomWait(min, max);
  }
  public async testSimulateScroll(page: any) {
    return this.simulateHumanScroll(page);
  }
  public async testHandleSecurity(page: any, options: CrawlerOptions) {
    return this.handleSecurity(page, options);
  }
}

const mockCaptchaSolver: CaptchaSolver = {
  solve: vi.fn().mockResolvedValue(true),
};

const mockProxyProvider: ProxyProvider = {
  getConfig: vi.fn().mockReturnValue(undefined),
};

vi.mock('#infrastructure/crawler/utils/human-interactions.js', async () => {
  const actual = (await vi.importActual(
    '#infrastructure/crawler/utils/human-interactions.js',
  )) as any;
  return {
    ...actual,
    handleCloudflareChallenge: vi.fn().mockResolvedValue(undefined),
    waitForCloudflareClear: vi.fn().mockResolvedValue(true),
  };
});

vi.mock('node:fs', async () => {
  const actual = (await vi.importActual('node:fs')) as any;
  return {
    ...actual,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

describe('Unit: BaseCrawler', () => {
  let crawler: TestCrawler;

  beforeEach(() => {
    vi.clearAllMocks();
    crawler = new TestCrawler(mockCaptchaSolver, mockProxyProvider, 1);
    global.fetch = vi.fn();
    vi.stubGlobal('setTimeout', (fn: any) => fn());
  });

  it('debería crear el directorio de perfiles si no existe', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);
    new TestCrawler(mockCaptchaSolver, mockProxyProvider, 1);
    expect(fs.mkdirSync).toHaveBeenCalled();
  });

  it('debería resolver la IP de salida y cachearla', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      json: vi.fn().mockResolvedValue({ ip: '1.1.1.1' }),
    });

    const ip1 = await crawler.testResolveIp();
    const ip2 = await crawler.testResolveIp();

    expect(ip1).toBe('1.1.1.1');
    expect(ip2).toBe('1.1.1.1');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('debería manejar fallos al resolver la IP de salida', async () => {
    (global.fetch as any).mockRejectedValue(new Error('network error'));
    const ip = await crawler.testResolveIp();
    expect(ip).toBeUndefined();
  });

  it('debería manejar cookies si los selectores son visibles', async () => {
    const mockLocator = {
      isVisible: vi.fn().mockResolvedValue(true),
      click: vi.fn().mockResolvedValue(undefined),
    };
    const mockPage = {
      locator: vi.fn().mockReturnValue({
        first: () => mockLocator,
      }),
    };

    await crawler.testHandleCookies(mockPage, ['.cookie-btn']);
    expect(mockLocator.click).toHaveBeenCalled();
  });

  it('debería saltar cookies si el selector no es visible', async () => {
    const mockLocator = {
      isVisible: vi.fn().mockResolvedValue(false),
      click: vi.fn(),
    };
    const mockPage = {
      locator: vi.fn().mockReturnValue({
        first: () => mockLocator,
      }),
    };

    await crawler.testHandleCookies(mockPage, ['.cookie-btn']);
    expect(mockLocator.click).not.toHaveBeenCalled();
  });

  it('debería ejecutar randomWait', async () => {
    const promise = crawler.testRandomWait(1, 2);
    await expect(promise).resolves.toBeUndefined();
  });

  it('debería ejecutar simulateHumanScroll', async () => {
    const mockPage = { evaluate: vi.fn().mockResolvedValue(undefined) };
    await crawler.testSimulateScroll(mockPage);
    expect(mockPage.evaluate).toHaveBeenCalled();
  });

  describe('Semaphore', () => {
    it('debería encolar peticiones si se supera el límite de concurrencia', async () => {
      const semCrawler = new TestCrawler(mockCaptchaSolver, mockProxyProvider, 1); // Límite 1

      let resolved = false;
      const p1 = semCrawler['semaphore'].acquire();
      const p2 = semCrawler['semaphore'].acquire().then(() => {
        resolved = true;
      });

      expect(resolved).toBe(false);

      semCrawler['semaphore'].release();
      await p2;
      expect(resolved).toBe(true);
    });
  });

  it('debería llamar al resolvedor de captcha si se solicita', async () => {
    const mockPage = {
      content: vi.fn().mockResolvedValue('challenges.cloudflare.com'),
      evaluate: vi.fn(),
      url: vi.fn().mockReturnValue('http://test.com'),
    };

    await crawler.testHandleSecurity(mockPage, { solverStrategy: 'capsolver' });
    expect(mockCaptchaSolver.solve).toHaveBeenCalledWith(mockPage);
  });
});
