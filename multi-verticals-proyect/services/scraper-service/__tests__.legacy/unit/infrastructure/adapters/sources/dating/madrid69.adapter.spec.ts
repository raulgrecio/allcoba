import { beforeEach, describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { Madrid69Adapter } from '#infrastructure/adapters/sources/dating/madrid69.adapter.js';

describe('Madrid69Adapter', () => {
  let adapter: Madrid69Adapter;

  const mockProfile = {
    id: 12345,
    nombre: 'Carla',
    edad: 22,
    descripcion: 'Chica dulce y apasionada.',
    ciudad: 'Madrid',
    telefono: '666555444',
    nacionalidad: 'Española',
    altura: 165,
    servicios: [{ nombre: 'Besos' }, { nombre: '69' }],
    tarifas: [{ duracion: 60, precio: 100, modalidad: 'incall' }],
  };

  beforeEach(() => {
    adapter = new Madrid69Adapter({} as CrawlerPort);
  });

  it('should identify profile URLs correctly', () => {
    expect(adapter.isProfileUrl('https://madrid69.com/citas/madrid/carla-123')).toBe(true);
    expect(adapter.isProfileUrl('https://madrid69.com/citas/madrid/')).toBe(false);
  });

  it('should handle domain check', () => {
    expect(adapter.canHandle('https://madrid69.com/any')).toBe(true);
  });

  it('should extract basic info from intercepted API', async () => {
    await adapter['onNetworkCaptured']([
      {
        url: 'https://api.madrid69.com/profile/12345',
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockProfile }),
      },
    ]);

    const $ = cheerio.load('<html><body><h1>Carla</h1></body></html>');
    const url = 'https://madrid69.com/citas/madrid/carla-12345';

    const id = adapter['extractId'](url, $);
    const title = adapter['extractTitle']($);
    const nickname = adapter['extractNickname']($, url);
    const phones = await adapter['extractPhones']($);

    expect(id).toBe('12345');
    expect(title).toBe('Carla');
    expect(nickname).toBe('Carla');
    expect(phones).toContain('666555444');
  });

  it('should handle API capture edge cases', async () => {
    // Invalid JSON
    await adapter['onNetworkCaptured']([
      {
        url: 'https://api.madrid69.com/fail',
        status: 200,
        contentType: 'application/json',
        body: 'invalid',
      },
    ]);
    expect((adapter as any)._profile).toBeNull();

    // Non-API URL
    await adapter['onNetworkCaptured']([
      {
        url: 'https://other.com/api',
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProfile),
      },
    ]);
    expect((adapter as any)._profile).toBeNull();

    // Direct profile structure (no .data)
    await adapter['onNetworkCaptured']([
      {
        url: 'https://api.madrid69.com/profile/direct',
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProfile),
      },
    ]);
    expect((adapter as any)._profile).not.toBeNull();
  });

  it('should fallback when API data is missing', async () => {
    const $ = cheerio.load(
      '<html><head><title>Sofia - Madrid69</title></head><body><h1>Sofia</h1></body></html>',
    );
    const url = 'https://madrid69.com/citas/madrid/sofia-999';

    expect(adapter['extractId'](url, $)).toBe('999');
    expect(adapter['extractTitle']($)).toBe('Sofia');
    expect(adapter['extractNickname']($, url)).toBe('Sofia');
  });

  it('should extract attributes correctly from API profile', async () => {
    await adapter['onNetworkCaptured']([
      {
        url: 'https://api.madrid69.com/profile/12345',
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: mockProfile }),
      },
    ]);

    const $ = cheerio.load('<html><body></body></html>');
    const url = 'https://madrid69.com/citas/madrid/carla-12345';
    const attributes = adapter['extractAttributes']($, url);

    expect(attributes.age).toBe(22);
    expect(attributes.nationality).toBe('Española');
    expect(attributes.services).toHaveLength(2);
  });

  it('should return undefined for next page URL (CSR)', () => {
    const html = '<html><body></body></html>';
    const nextUrl = adapter.extractNextPageUrl(html, 'https://madrid69.com/citas/madrid');
    expect(nextUrl).toBeUndefined();
  });
});
