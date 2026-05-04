import { describe, it, expect, vi } from 'vitest';
import { IdealistaAdapter } from '@/infrastructure/adapters/sources/real-estate/idealista.adapter.js';

describe('Unit: IdealistaAdapter', () => {
  const adapter = new IdealistaAdapter({} as any);

  it('debería identificar URLs de idealista', () => {
    expect(adapter.canHandle('https://www.idealista.com/inmueble/123/')).toBe(true);
    expect(adapter.canHandle('https://www.fotocasa.es/')).toBe(false);
  });

  it('debería extraer datos básicos de un HTML mock', async () => {
    const mockHtml = `
      <html>
        <h1 class="main-info__title-main">Piso en venta</h1>
        <span class="info-data-price">450.000 €</span>
        <div class="main-info__title-minor">Calle Mayor, Madrid</div>
        <div class="adCommentsLanguageSelector">Gran oportunidad...</div>
        <div class="phone-number">600111222</div>
      </html>
    `;
    
    // Mock crawler
    const mockCrawler: any = {
      fetch: vi.fn().mockResolvedValue({
        html: mockHtml,
        url: 'https://www.idealista.com/inmueble/123/',
        status: 200
      }),
      close: vi.fn()
    };
    const adapterWithCrawler = new IdealistaAdapter(mockCrawler);
    
    const result = await adapterWithCrawler.extract('https://www.idealista.com/inmueble/123/');
    
    expect(result.data.name).toBe('Piso en venta');
    expect(result.data.price).toBe(450000);
    expect(result.data.address).toBe('Calle Mayor, Madrid');
    expect(result.data.phones).toContain('600111222');
  });
});
