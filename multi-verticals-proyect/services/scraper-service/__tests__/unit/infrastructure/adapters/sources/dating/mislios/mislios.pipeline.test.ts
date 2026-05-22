import { describe, expect, it } from 'vitest';

import { extractMislios } from '#infrastructure/adapters/sources/dating/mislios/mislios.extractor.js';
import {
  mapMislios,
  MISLIOS_SOURCE,
} from '#infrastructure/adapters/sources/dating/mislios/mislios.mapper.js';
import { MisliosPipeline } from '#infrastructure/adapters/sources/dating/mislios/mislios.pipeline.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://mislios.com/anuncios/ana-escort-madrid/';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('MisliosPipeline class methods', () => {
  const pipeline = new MisliosPipeline();

  it('identifier is mislios', () => {
    expect(pipeline.identifier).toBe('mislios');
  });

  it('canHandle mislios.com URLs', () => {
    expect(pipeline.canHandle('https://mislios.com/escorts/madrid/ana-123')).toBe(true);
    expect(pipeline.canHandle('https://other.com')).toBe(false);
  });

  it('isProfileUrl — /escorts/{city}/{slug}-{id}/ is a profile', () => {
    expect(pipeline.isProfileUrl('https://mislios.com/escorts/madrid/ana-escort-123')).toBe(true);
  });

  it('isProfileUrl — /escorts/madrid/ listing is not a profile', () => {
    expect(pipeline.isProfileUrl('https://mislios.com/escorts/madrid/')).toBe(false);
  });

  it('isProfileUrl — slug without numeric suffix is not a profile', () => {
    expect(pipeline.isProfileUrl('https://mislios.com/escorts/madrid/sin-numero')).toBe(false);
  });

  it('getCrawlerOptions — profile URL has no onBeforeCapture', () => {
    const profileUrl = 'https://mislios.com/escorts/madrid/ana-123';
    const opts = pipeline.getCrawlerOptions(profileUrl);
    expect(opts.waitUntil).toBe('networkidle');
    // profile branch: onBeforeCapture is undefined
    expect(opts.onBeforeCapture).toBeUndefined();
  });

  it('getCrawlerOptions — listing URL has onBeforeCapture fn', () => {
    const listingUrl = 'https://mislios.com/escorts/madrid/';
    const opts = pipeline.getCrawlerOptions(listingUrl);
    expect(opts.waitUntil).toBe('networkidle');
    expect(typeof opts.onBeforeCapture).toBe('function');
  });
});

describe('mislios pipeline — HTML → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('ana_escort-madrid.html');
    const payload = extractMislios(html, SOURCE_URL);
    const sp = await mapMislios(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(MISLIOS_SOURCE);
    expect(sp.nickname).toBe('Ana');
    expect(sp.phoneNumber).toBe('622345678');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.photos).toHaveLength(3);
    expect(sp.externalRefs[0]?.source).toBe(MISLIOS_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
