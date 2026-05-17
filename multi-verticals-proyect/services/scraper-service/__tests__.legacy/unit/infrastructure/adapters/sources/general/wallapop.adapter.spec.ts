import { describe, expect, it, vi } from 'vitest';

import { Vertical } from '#domain/entities/vertical.js';
import { WallapopAdapter } from '#infrastructure/adapters/sources/general/wallapop.adapter.js';

describe('Unit: WallapopAdapter', () => {
  const adapter = new WallapopAdapter({} as any);

  it('debería identificar URLs de wallapop', () => {
    expect(adapter.canHandle('https://es.wallapop.com/item/test-123')).toBe(true);
  });

  it('debería detectar verticales por URL', () => {
    expect(
      adapter['detectVertical']('https://es.wallapop.com/item/piso-c11098-inmobiliaria/1'),
    ).toBe(Vertical.REAL_ESTATE);
    expect(adapter['detectVertical']('https://es.wallapop.com/item/coche-c11545-coches/1')).toBe(
      Vertical.MOTOR,
    );
    expect(adapter['detectVertical']('https://es.wallapop.com/item/comun-1')).toBe(
      Vertical.GENERAL,
    );
  });

  it('debería extraer datos básicos desde __NEXT_DATA__', async () => {
    const nextData = JSON.stringify({
      props: {
        pageProps: {
          item: {
            title: { original: 'Producto test' },
            description: { original: 'Descripción...' },
            price: { cash: { amount: 100 } },
            location: {
              city: 'Madrid',
              postalCode: '28001',
              countryCode: 'ES',
              latitude: 40.4,
              longitude: -3.7,
            },
            images: [
              {
                urls: {
                  small: 'http://cdn/img.jpg?pictureSize=W320',
                  medium: 'http://cdn/img.jpg?pictureSize=W640',
                  big: 'http://cdn/img.jpg?pictureSize=W800',
                },
              },
            ],
            characteristics: 'Como nuevo',
            taxonomies: [{ name: 'Deporte y ocio' }],
            flags: { sold: false },
          },
        },
      },
    });

    const mockHtml = `
      <html>
        <h1>Producto test</h1>
        <script id="__NEXT_DATA__" type="application/json">${nextData}</script>
      </html>
    `;

    const mockCrawler: any = {
      fetch: vi.fn().mockResolvedValue({ html: mockHtml, url: 'url', status: 200 }),
      close: vi.fn(),
    };

    const adapterWithCrawler = new WallapopAdapter(mockCrawler);
    const result = await adapterWithCrawler.extract('https://es.wallapop.com/item/test-123');

    expect(result.data.name).toBe('Producto test');
    expect(result.data.price).toBe(100);
    expect(result.data.location.city).toBe('Madrid');
    expect(result.data.location.postalCode).toBe('28001');
    expect(result.data.location.country).toBe('ES');
    expect(result.data.location.coordinates).toEqual({ lat: 40.4, lng: -3.7 });
    expect(result.data.imageUrls).toContain('http://cdn/img.jpg?pictureSize=W800');
  });
});
