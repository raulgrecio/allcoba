import { chromium } from 'playwright-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlaywrightCrawler } from '#infrastructure/crawler/playwright-crawler.js';

// Mock playwright-extra chromium
vi.mock('playwright-extra', () => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue({
      status: () => 200,
      serverAddr: () => Promise.resolve({ ipAddress: '1.2.3.4' }),
    }),
    content: vi.fn().mockResolvedValue('<html></html>'),
    waitForTimeout: vi.fn().mockResolvedValue({}),
    evaluate: vi.fn().mockResolvedValue('Mozilla/5.0'),
    locator: vi.fn().mockReturnValue({
      first: vi.fn().mockReturnThis(),
      isVisible: vi.fn().mockResolvedValue(false),
      click: vi.fn().mockResolvedValue({}),
    }),
    close: vi.fn(),
  };

  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn(),
  };

  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn(),
  };

  return {
    chromium: {
      use: vi.fn(),
      launch: vi.fn().mockResolvedValue(mockBrowser),
    },
  };
});

describe('Unit: PlaywrightCrawler', () => {
  let crawler: PlaywrightCrawler;

  beforeEach(() => {
    vi.clearAllMocks();
    crawler = new PlaywrightCrawler();

    // Mock delays to be instant in tests
    vi.spyOn(crawler as any, 'randomWait').mockResolvedValue(undefined);
    vi.spyOn(crawler as any, 'simulateHumanScroll').mockResolvedValue(undefined);

    global.fetch = vi.fn().mockResolvedValue({
      json: vi.fn().mockResolvedValue({ ip: '5.6.7.8' }),
    });
  });

  it('debería inicializar el navegador y navegar a una URL', async () => {
    const result = await crawler.fetch('https://example.com/ad/123');

    expect(chromium.launch).toHaveBeenCalled();
    expect(result.html).toBe('<html></html>');
    expect(result.status).toBe(200);
    expect(result.serverIp).toBe('1.2.3.4');
    expect(result.outboundIp).toBe('5.6.7.8');
  });

  it('debería ejecutar hooks de snapshot y pre-captura', async () => {
    const onSnapshot = vi.fn().mockResolvedValue({});
    const onBeforeCapture = vi.fn().mockResolvedValue({});

    await crawler.fetch('https://example.com/ad/123', {
      onSnapshot,
      onBeforeCapture,
    });

    expect(onSnapshot).toHaveBeenCalled();
    expect(onBeforeCapture).toHaveBeenCalled();
  });

  it('debería intentar gestionar cookies si se detectan', async () => {
    // Re-mock para que el botón de cookies sea visible
    const mockPage = await (await ((await chromium.launch()) as any).newContext()).newPage();
    mockPage.locator().isVisible.mockResolvedValueOnce(true);

    await crawler.fetch('https://example.com');

    expect(mockPage.locator).toHaveBeenCalledWith('#didomi-notice-agree-button');
    expect(mockPage.locator().click).toHaveBeenCalled();
  });

  it('debería cerrar el navegador correctamente', async () => {
    await crawler.init();
    await crawler.close();

    const browser = await chromium.launch();
    expect(browser.close).toHaveBeenCalled();
  });
});
