import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { Vertical } from '#domain/entities/vertical.js';
import { DiscoveryAdapter } from '#infrastructure/adapters/sources/general/discovery.adapter.js';

describe('Unit: DiscoveryAdapter', () => {
  const adapter = new DiscoveryAdapter({} as CrawlerPort);

  it('handles any URL', () => {
    expect(adapter.canHandle('https://any-random-site.com')).toBe(true);
  });

  it('generates a consistent ID from the URL', () => {
    const url = 'https://example.com/item/123';
    const id1 = adapter['extractId'](url);
    const id2 = adapter['extractId'](url);
    expect(id1).toBe(id2);
    expect(id1).toMatch(/^disc_[a-zA-Z0-9]{16}$/);
  });

  it('extracts title from <title> tag', () => {
    const $ = cheerio.load('<html><head><title>Test Title</title></head></html>');
    expect(adapter['extractTitle']($)).toBe('Test Title');
  });

  it('extracts title from <h1> if <title> is missing', () => {
    const $ = cheerio.load('<html><body><h1>H1 Title</h1></body></html>');
    expect(adapter['extractTitle']($)).toBe('H1 Title');
  });

  it('extracts description from meta tag', () => {
    const $ = cheerio.load(
      '<html><head><meta name="description" content="Meta Description"></head></html>',
    );
    expect(adapter['extractDescription']($)).toBe('Meta Description');
  });

  it('extracts description from og:description if meta description is missing', () => {
    const $ = cheerio.load(
      '<html><head><meta property="og:description" content="OG Description"></head></html>',
    );
    expect(adapter['extractDescription']($)).toBe('OG Description');
  });

  it('has default vertical general', () => {
    expect(adapter.defaultVertical).toBe(Vertical.GENERAL);
  });

  it('returns empty string for description if no meta tags found', () => {
    const $ = cheerio.load('<html></html>');
    expect(adapter['extractDescription']($)).toBe('');
  });

  it('returns default location with country only', () => {
    const $ = cheerio.load('');
    expect(adapter['extractLocation']($, 'https://example.com')).toEqual({ country: 'ES' });
  });

  it('returns undefined for price', () => {
    expect(adapter['extractPrice']()).toBe(undefined);
  });

  it('provides generic image selectors', () => {
    const selectors = adapter['getImageSelectors']();
    expect(selectors).toContain('meta[property="og:image"]');
    expect(selectors).toContain('main img');
  });

  it('extracts attributes including isDiscovery flag', () => {
    const attrs = adapter['extractAttributes']();
    expect(attrs.isDiscovery).toBe(true);
    expect(attrs.extractedAt).toBeDefined();
  });

  it('is always allowed for manual discovery', async () => {
    expect(await adapter.isAllowed('https://any.com')).toBe(true);
  });
});
