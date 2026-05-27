import { describe, expect, it, vi } from 'vitest';

import { extractBluemove } from '#infrastructure/adapters/sources/dating/bluemove/bluemove.extractor.js';
import {
  BLUEMOVE_SOURCE,
  mapBluemove,
} from '#infrastructure/adapters/sources/dating/bluemove/bluemove.mapper.js';
import { BluemovePipeline } from '#infrastructure/adapters/sources/dating/bluemove/bluemove.pipeline.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://bluemove.es/madrid/escorts/#56636';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('bluemove pipeline — HTML → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('andreia_56636.html');
    const payload = extractBluemove(html, SOURCE_URL);
    const sp = await mapBluemove(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(BLUEMOVE_SOURCE);
    expect(sp.nickname).toBe('Andreia');
    expect(sp.phoneNumber).toBe('603841323');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.contactOptions).toContain('whatsapp');
    expect(sp.contactOptions).toContain('telegram');
    expect(sp.photos.length).toBeGreaterThan(3);
    expect(sp.baseCity?.id).toBe('city:madrid');
    expect(sp.personalDetails.ageYears).toBe(28);
    expect(sp.externalRefs[0]?.source).toBe(BLUEMOVE_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});

describe('BluemovePipeline class methods', () => {
  const pipeline = new BluemovePipeline();

  it('identifier is bluemove', () => {
    expect(pipeline.identifier).toBe('bluemove');
  });

  it('canHandle bluemove.es URLs', () => {
    expect(pipeline.canHandle('https://bluemove.es/madrid/escorts/')).toBe(true);
    expect(pipeline.canHandle('https://other.com/page')).toBe(false);
  });

  it('isProfileUrl \u2014 hash #id is a profile', () => {
    expect(pipeline.isProfileUrl('https://bluemove.es/madrid/escorts/#56636')).toBe(true);
  });

  it('isProfileUrl \u2014 no hash is not a profile', () => {
    expect(pipeline.isProfileUrl('https://bluemove.es/madrid/escorts/')).toBe(false);
  });

  it('getCrawlerOptions \u2014 listing URL returns base (no waitUntil override)', () => {
    const opts = pipeline.getCrawlerOptions('https://bluemove.es/madrid/escorts/');
    expect(opts.waitUntil).toBeUndefined();
    expect(opts.onBeforeCapture).toBeUndefined();
  });

  it('getCrawlerOptions \u2014 profile URL includes waitUntil networkidle + onBeforeCapture', () => {
    const opts = pipeline.getCrawlerOptions('https://bluemove.es/madrid/escorts/#56636');
    expect(opts.waitUntil).toBe('networkidle');
    expect(typeof opts.onBeforeCapture).toBe('function');
  });

  it('getCrawlerOptions profile \u2014 onBeforeCapture calls waitForSelector then resolves', async () => {
    const opts = pipeline.getCrawlerOptions('https://bluemove.es/madrid/escorts/#56636');
    const mockPage = { waitForSelector: vi.fn().mockResolvedValue(null) };
    await opts.onBeforeCapture!(mockPage as any);
    expect(mockPage.waitForSelector).toHaveBeenCalledWith('escort-modal .em-profile-name', {
      timeout: 15000,
    });
  });

  it('getCrawlerOptions profile \u2014 onBeforeCapture swallows waitForSelector rejection', async () => {
    const opts = pipeline.getCrawlerOptions('https://bluemove.es/madrid/escorts/#56636');
    const mockPage = { waitForSelector: vi.fn().mockRejectedValue(new Error('timeout')) };
    await expect(opts.onBeforeCapture!(mockPage as any)).resolves.toBeUndefined();
  });
});
