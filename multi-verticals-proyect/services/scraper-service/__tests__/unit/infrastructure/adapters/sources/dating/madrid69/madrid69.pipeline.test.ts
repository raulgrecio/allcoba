import { describe, expect, it, vi } from 'vitest';

import { extractMadrid69 } from '#infrastructure/adapters/sources/dating/madrid69/madrid69.extractor.js';
import {
  MADRID69_SOURCE,
  mapMadrid69,
} from '#infrastructure/adapters/sources/dating/madrid69/madrid69.mapper.js';
import { Madrid69Pipeline } from '#infrastructure/adapters/sources/dating/madrid69/madrid69.pipeline.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml, loadJson } from './helpers/load-fixtures.js';

const SOURCE_URL =
  'https://www.madrid69.com/citas-chicas-madrid-44064-thalia-pura-ternura-644417235';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('Madrid69Pipeline class methods', () => {
  const pipeline = new Madrid69Pipeline();

  it('identifier is madrid69', () => {
    expect(pipeline.identifier).toBe('madrid69');
  });

  it('canHandle madrid69.com URLs', () => {
    expect(pipeline.canHandle('https://www.madrid69.com/citas-chicas-madrid-1-ana')).toBe(true);
    expect(pipeline.canHandle('https://other.com/page')).toBe(false);
  });

  it('isProfileUrl — /citas-chicas-{suffix} is a profile', () => {
    expect(
      pipeline.isProfileUrl('https://www.madrid69.com/citas-chicas-madrid-44064-thalia-644417235'),
    ).toBe(true);
  });

  it('isProfileUrl — multi-segment path not a profile', () => {
    expect(pipeline.isProfileUrl('https://www.madrid69.com/citas-chicas/madrid')).toBe(false);
  });

  it('isProfileUrl — non-citas-chicas path not a profile', () => {
    expect(pipeline.isProfileUrl('https://www.madrid69.com/otros-anuncios-1')).toBe(false);
  });

  it('extractNextPageUrl — always returns undefined (CSR pagination)', () => {
    expect(pipeline.extractNextPageUrl('<html/>', 'https://www.madrid69.com')).toBeUndefined();
  });

  it('getCrawlerOptions — profile URL uses networkidle + captureNetwork', () => {
    const opts = pipeline.getCrawlerOptions('https://www.madrid69.com/citas-chicas-madrid-1-ana');
    expect(opts.waitUntil).toBe('networkidle');
    expect(opts.captureNetwork).toBe(true);
  });

  it('getCrawlerOptions — listing URL also uses networkidle', () => {
    const opts = pipeline.getCrawlerOptions('https://www.madrid69.com/escorts/madrid');
    expect(opts.waitUntil).toBe('networkidle');
    expect(opts.captureNetwork).toBe(true);
  });

  it('getCrawlerOptions — listing URL onBeforeCapture calls waitForSelector', async () => {
    const opts = pipeline.getCrawlerOptions('https://www.madrid69.com/escorts/madrid');
    const mockPage = { waitForSelector: vi.fn().mockResolvedValue(null) };
    await opts.onBeforeCapture!(mockPage as any);
    expect(mockPage.waitForSelector).toHaveBeenCalledWith(
      'a[href*="citas-chicas-"]',
      expect.objectContaining({ timeout: 15000 }),
    );
  });

  it('getCrawlerOptions — profile URL onBeforeCapture returns early (no waitForSelector)', async () => {
    const opts = pipeline.getCrawlerOptions('https://www.madrid69.com/citas-chicas-madrid-1-ana');
    const mockPage = { waitForSelector: vi.fn() };
    await opts.onBeforeCapture!(mockPage as any);
    expect(mockPage.waitForSelector).not.toHaveBeenCalled();
  });

  it('extract — without networkResponses works (no apiJson)', () => {
    const payload = pipeline.extract('<html><body></body></html>', SOURCE_URL);
    expect(payload).toBeDefined();
  });

  it('extract — skips malformed JSON in networkResponses', () => {
    const payload = pipeline.extract('<html><body></body></html>', SOURCE_URL, [
      { url: 'https://api-prod.valenciacitas.com/v3/profiles/44064', body: 'not-json' },
    ]);
    expect(payload).toBeDefined();
  });

  it('extract — ignores non-matching networkResponse URLs', () => {
    const payload = pipeline.extract('<html><body></body></html>', SOURCE_URL, [
      { url: 'https://other.api.com/v1/data', body: '{"id":1}' },
    ]);
    expect(payload).toBeDefined();
  });
});

describe('madrid69 pipeline — HTML + API JSON → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('kheila_44064.html');
    const apiJson = loadJson('kheila_44064.json');
    const payload = extractMadrid69(html, SOURCE_URL, apiJson);
    const sp = await mapMadrid69(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(MADRID69_SOURCE);
    expect(sp.nickname).toBe('Kheila');
    expect(sp.phoneNumber).toBe('644417235');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.contactOptions).toContain('whatsapp');
    expect(sp.photos).toHaveLength(2);
    expect(sp.externalRefs[0]?.source).toBe(MADRID69_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
    expect(sp.confidence).toBeGreaterThan(0.5); // medium (has age from API)
  });
});
