import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/domain';

import { Vertical } from '#domain/entities/vertical.js';
import { BaseSourceAdapter } from '#infrastructure/adapters/sources/base-source.adapter.js';

class TestAdapter extends BaseSourceAdapter {
  readonly identifier = 'test';
  readonly defaultVertical = Vertical.GENERAL;
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  canHandle(url: string): boolean {
    return url.includes('test.com');
  }

  protected extractId(_url: string, _$: CheerioAPI): string {
    return '123';
  }
  protected extractTitle(_$: CheerioAPI): string {
    return 'Title';
  }
  protected extractDescription(_$: CheerioAPI): string {
    return 'Desc';
  }
  protected extractAddress(_$: CheerioAPI): string {
    return 'Addr';
  }
  protected extractPrice(_$: CheerioAPI): number | undefined {
    return 100;
  }
  protected extractAttributes(_$: CheerioAPI): any {
    return {};
  }
}

describe('Unit: BaseSourceAdapter', () => {
  let adapter: TestAdapter;
  let mockCrawler: any;

  beforeEach(() => {
    mockCrawler = {
      fetch: vi.fn(),
      isAllowed: vi.fn(),
    };
    adapter = new TestAdapter(mockCrawler);
  });

  it('checks robots.txt permission', async () => {
    const mockIsAllowed = vi.spyOn(adapter['robotsChecker'], 'isAllowed').mockResolvedValue(true);
    const allowed = await adapter.isAllowed('https://test.com/p1');
    expect(allowed).toBe(true);
    expect(mockIsAllowed).toHaveBeenCalledWith('https://test.com/p1');
  });

  it('identifies profile URLs by default', () => {
    expect(adapter.isProfileUrl('https://test.com/anything')).toBe(true);
  });

  it('extracts profile links from HTML', () => {
    const html = `
      <a href="/profile/1">Link 1</a>
      <a href="https://other.com/p2">Link 2</a>
      <a href="https://test.com/profile/3">Link 3</a>
    `;
    const links = adapter.extractProfileLinks(html, 'https://test.com');
    // /profile/1 -> https://test.com/profile/1 (Valid)
    // https://other.com/p2 (Invalid canHandle)
    // https://test.com/profile/3 (Valid)
    expect(links).toHaveLength(2);
    expect(links).toContain('https://test.com/profile/1');
    expect(links).toContain('https://test.com/profile/3');
  });

  it('handles invalid URLs in extractProfileLinks', () => {
    const html = '<a href="https://other-domain.com/p1">Link</a>';
    const links = adapter.extractProfileLinks(html, 'https://test.com');
    expect(links).toHaveLength(0);
  });

  it('picks the best image from srcset based on width and format', () => {
    const srcset = 'https://test.com/small.jpg 300w, https://test.com/large.jpg 1200w';
    const result = adapter['pickBestSrcset'](srcset, '', 0);
    expect(result.src).toBe('https://test.com/large.jpg');
    expect(result.maxW).toBe(1200);
  });

  it('extracts images from <picture> elements', () => {
    const html = `
      <picture>
        <source srcset="https://test.com/img.webp" type="image/webp">
        <img src="https://test.com/img.jpg">
      </picture>
    `;
    const $ = cheerio.load(html);
    const images = adapter['extractImagesFromDom']($, ['picture']);
    expect(images).toContain('https://test.com/img.webp');
  });

  it('extracts images from various attributes', () => {
    const html = `
      <img data-src="https://test.com/1.jpg">
      <img data-lazy="https://test.com/2.jpg">
      <img data-original="https://test.com/3.jpg">
    `;
    const $ = cheerio.load(html);
    const images = adapter['extractImagesFromDom']($, ['img']);
    expect(images).toContain('https://test.com/1.jpg');
    expect(images).toContain('https://test.com/2.jpg');
    expect(images).toContain('https://test.com/3.jpg');
  });

  it('parses numbers from text using regex', () => {
    const patterns = [/(\d+) €/, /Precio: (\d+)/];
    expect(adapter['parseFromText']('Cuesta 500 €', patterns)).toBe(500);
    expect(adapter['parseFromText']('Precio: 1200', patterns)).toBe(1200);
    expect(adapter['parseFromText']('Nada aquí', patterns)).toBeUndefined();
  });

  it('collects and cleans up features with colons', () => {
    const html = `
      <div class="feat">Energía: A</div>
      <div class="feat">Ascensor</div>
    `;
    const $ = cheerio.load(html);
    const features = adapter['collectRawFeatures']($, '.feat');
    expect(features['Energía']).toBe('A');
    expect(features['Ascensor']).toBe('Sí');
  });

  it('handles technical metadata in extract', async () => {
    const mockResult: any = {
      html: '<html><body>Title</body></html>',
      status: 200,
      userAgent: 'test-agent',
      serverIp: '1.1.1.1',
      outboundIp: '2.2.2.2',
    };
    mockCrawler.fetch.mockResolvedValue(mockResult);

    const { data } = await adapter.extract('https://test.com/p1');

    expect(data.metadata.statusCode).toBe(200);
    expect(data.metadata.userAgent).toBe('test-agent');
    expect(data.metadata.serverIp).toBe('1.1.1.1');
    expect(data.metadata.sourceUrl).toBe('https://test.com/p1');
  });
});
