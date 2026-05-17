import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CheerioCrawler } from '#infrastructure/crawler/engines/cheerio.crawler.js';

describe('Unit: CheerioCrawler', () => {
  let crawler: CheerioCrawler;

  beforeEach(() => {
    // Mocks mínimos para BaseCrawler
    const mockCaptchaSolver = { solve: vi.fn() } as any;
    const mockProxyProvider = { getProxy: vi.fn() } as any;
    
    crawler = new CheerioCrawler(mockCaptchaSolver, mockProxyProvider);
    global.fetch = vi.fn();
  });

  it('debería descargar el HTML y devolver un CrawlResult', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      text: vi.fn().mockResolvedValue('<html><body><h1>Test</h1></body></html>'),
    } as any);

    const result = await crawler.fetch('https://example.com');
    
    expect(result.html).toContain('<h1>Test</h1>');
    expect(result.status).toBe(200);
    expect(result.userAgent).toBeDefined();
  });

  it('debería lanzar error si la respuesta no es ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    } as any);

    await expect(crawler.fetch('https://example.com')).rejects.toThrow('Error al descargar');
  });
});
