import { describe, it, expect, vi } from 'vitest';
import { WallapopAdapter } from '@/infrastructure/adapters/sources/general/wallapop.adapter.js';
import { Vertical } from '@/domain/entities/vertical.js';

describe('Unit: WallapopAdapter', () => {
  const adapter = new WallapopAdapter({} as any);

  it('debería identificar URLs de wallapop', () => {
    expect(adapter.canHandle('https://es.wallapop.com/item/test-123')).toBe(true);
  });

  it('debería detectar verticales por URL', () => {
    expect(adapter['detectVertical']('https://es.wallapop.com/item/piso-c11098-inmobiliaria/1')).toBe(Vertical.REAL_ESTATE);
    expect(adapter['detectVertical']('https://es.wallapop.com/item/coche-c11545-coches/1')).toBe(Vertical.MOTOR);
    expect(adapter['detectVertical']('https://es.wallapop.com/item/comun-1')).toBe(Vertical.GENERAL);
  });

  it('debería extraer datos básicos', async () => {
    const mockHtml = `
      <html>
        <h1>Producto test</h1>
        <span class="item-detail-price">100€</span>
        <div class="item-detail-description">Descripción...</div>
      </html>
    `;
    
    const mockCrawler: any = {
      fetch: vi.fn().mockResolvedValue({ html: mockHtml, url: 'url', status: 200 }),
      close: vi.fn()
    };
    
    const adapterWithCrawler = new WallapopAdapter(mockCrawler);
    const result = await adapterWithCrawler.extract('https://es.wallapop.com/item/test-123');
    
    expect(result.data.name).toBe('Producto test');
    expect(result.data.price).toBe(100);
  });
});
