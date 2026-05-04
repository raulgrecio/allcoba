import { describe, it, expect, vi } from 'vitest';
import { CochesNetAdapter } from '@/infrastructure/adapters/sources/motor/coches-net.adapter.js';

describe('Unit: CochesNetAdapter', () => {
  const adapter = new CochesNetAdapter({} as any);

  it('debería identificar URLs de coches.net', () => {
    expect(adapter.canHandle('https://www.coches.net/test-123')).toBe(true);
  });

  it('debería extraer datos básicos', async () => {
    const mockHtml = `
      <html>
        <h1>Coche fantástico</h1>
        <span class="mt-Price">25.000 €</span>
        <div class="mt-Description">En perfecto estado...</div>
      </html>
    `;
    
    const mockCrawler: any = {
      fetch: vi.fn().mockResolvedValue({ html: mockHtml, url: 'url', status: 200 }),
      close: vi.fn()
    };
    
    const adapterWithCrawler = new CochesNetAdapter(mockCrawler);
    const result = await adapterWithCrawler.extract('https://www.coches.net/test-123');
    
    expect(result.data.name).toBe('Coche fantástico');
    expect(result.data.price).toBe(25000);
  });
});
