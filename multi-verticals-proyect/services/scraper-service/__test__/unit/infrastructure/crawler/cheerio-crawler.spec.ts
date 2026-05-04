import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CheerioCrawler } from '@scraper/infrastructure/crawler/cheerio-crawler.js';

describe('Unit: CheerioCrawler', () => {
  let crawler: CheerioCrawler;

  beforeEach(() => {
    crawler = new CheerioCrawler();
    global.fetch = vi.fn();
  });

  it('debería descargar y cargar HTML con cheerio', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('<html><body><h1>Test</h1></body></html>'),
    } as any);

    const $ = await crawler.fetch('https://example.com');
    expect($('h1').text()).toBe('Test');
  });

  it('debería lanzar error si la respuesta no es ok', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      statusText: 'Not Found',
    } as any);

    await expect(crawler.fetch('https://example.com')).rejects.toThrow('Error al descargar');
  });
});
