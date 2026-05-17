import { describe, expect, it, vi } from 'vitest';
import { chromium as playwright } from 'playwright-core';
import { chromium as patchright } from 'patchright';

import type { CaptchaSolver } from '#application/ports/captcha-solver.port.js';
import type { ProxyProvider } from '#application/ports/proxy-provider.port.js';
import { ChromiumCrawler } from '#infrastructure/crawler/engines/chromium.crawler.js';

// Helper para crear el mock del motor (dentro del hoisting si fuera necesario, 
// pero aquí lo usaremos directamente en el mock)
const createMockEngine = () => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue({
      status: () => 200,
      serverAddr: () => Promise.resolve({ ipAddress: '1.2.3.4' }),
    }),
    content: vi.fn().mockResolvedValue('<html></html>'),
    evaluate: vi.fn().mockResolvedValue('Mozilla/5.0'),
    locator: vi.fn().mockReturnValue({
      first: vi.fn().mockReturnThis(),
      isVisible: vi.fn().mockResolvedValue(false),
      click: vi.fn().mockResolvedValue({}),
    }),
    on: vi.fn(),
    waitForFunction: vi.fn().mockResolvedValue({}),
    close: vi.fn(),
    waitForLoadState: vi.fn().mockResolvedValue({}),
    context: () => ({
      clearCookies: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }),
    mouse: {
      move: vi.fn().mockResolvedValue(undefined),
      click: vi.fn().mockResolvedValue(undefined),
    },
  };

  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
    addInitScript: vi.fn().mockResolvedValue(undefined),
  };

  const mockBrowser = {
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(undefined),
  };

  return {
    launch: vi.fn().mockResolvedValue(mockBrowser),
    launchPersistentContext: vi.fn().mockResolvedValue(mockContext),
  };
};

const mockedPlaywright = vi.hoisted(() => ({
  chromium: {
    name: vi.fn().mockReturnValue('chromium'),
    launch: vi.fn(),
    launchPersistentContext: vi.fn(),
  }
}));

const mockedPatchright = vi.hoisted(() => ({
  chromium: {
    name: vi.fn().mockReturnValue('chromium'),
    launch: vi.fn(),
    launchPersistentContext: vi.fn(),
  }
}));

vi.mock('playwright-core', () => mockedPlaywright);
vi.mock('patchright', () => mockedPatchright);

const mockCaptchaSolver: CaptchaSolver = {
  solve: vi.fn().mockResolvedValue(true),
};

const mockProxyProvider: ProxyProvider = {
  getConfig: vi.fn().mockReturnValue(undefined),
};

describe('Unit: ChromiumCrawler', () => {
  const setupMocks = (engineMock: any) => {
    const mockPage = {
      goto: vi.fn().mockResolvedValue({
        status: () => 200,
        serverAddr: () => Promise.resolve({ ipAddress: '1.2.3.4' }),
      }),
      content: vi.fn().mockResolvedValue('<html></html>'),
      evaluate: vi.fn().mockResolvedValue('Mozilla/5.0'),
      locator: vi.fn().mockReturnValue({
        first: vi.fn().mockReturnThis(),
        isVisible: vi.fn().mockResolvedValue(false),
        click: vi.fn().mockResolvedValue({}),
      }),
      on: vi.fn(),
      context: () => ({ close: vi.fn() }),
      close: vi.fn(),
    };
    const mockContext = {
      newPage: vi.fn().mockResolvedValue(mockPage),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const mockBrowser = {
      newContext: vi.fn().mockResolvedValue(mockContext),
      close: vi.fn().mockResolvedValue(undefined),
    };

    engineMock.launch.mockResolvedValue(mockBrowser);
    engineMock.launchPersistentContext.mockResolvedValue(mockContext);
  };

  it('debería funcionar con motor Playwright (Standard)', async () => {
    setupMocks(mockedPlaywright.chromium);
    const crawler = new ChromiumCrawler(playwright, mockCaptchaSolver, mockProxyProvider, 1);
    vi.spyOn(crawler as any, 'randomWait').mockResolvedValue(undefined);

    const result = await crawler.fetch('https://example.com');
    expect(mockedPlaywright.chromium.launch).toHaveBeenCalled();
    expect(result.status).toBe(200);
  });

  it('debería funcionar con motor Patchright', async () => {
    setupMocks(mockedPatchright.chromium);
    const crawler = new ChromiumCrawler(patchright, mockCaptchaSolver, mockProxyProvider, 1);
    vi.spyOn(crawler as any, 'randomWait').mockResolvedValue(undefined);

    const result = await crawler.fetch('https://example.com');
    expect(mockedPatchright.chromium.launch).toHaveBeenCalled();
    expect(result.status).toBe(200);
  });

  it('debería usar perfil persistente si se proporciona sessionProfile', async () => {
    setupMocks(mockedPlaywright.chromium);
    const crawler = new ChromiumCrawler(playwright, mockCaptchaSolver, mockProxyProvider, 1);
    vi.spyOn(crawler as any, 'randomWait').mockResolvedValue(undefined);

    await crawler.fetch('https://example.com', { sessionProfile: 'test-profile' });
    expect(mockedPlaywright.chromium.launchPersistentContext).toHaveBeenCalled();
  });
});
