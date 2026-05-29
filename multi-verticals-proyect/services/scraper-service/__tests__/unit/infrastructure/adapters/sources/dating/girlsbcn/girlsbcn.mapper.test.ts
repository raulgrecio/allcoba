import { beforeAll, describe, expect, it } from 'vitest';

import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { extractGirlsBcn } from '#infrastructure/adapters/sources/dating/girlsbcn/girlsbcn.extractor.js';
import {
  GIRLSBCN_SOURCE,
  GIRLSMADRID_SOURCE,
  mapGirlsBcn,
  mapGirlsBcnLike,
} from '#infrastructure/adapters/sources/dating/girlsbcn/girlsbcn.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtmlFixture } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://www.girlsbcn.net/escort/gbcamila105.html';
const NOW = new Date('2026-01-15T10:00:00.000Z');

let sp: ScrapedProvider;

beforeAll(async () => {
  const html = loadHtmlFixture('camila105.html');
  const payload = extractGirlsBcn(html, SOURCE_URL);
  sp = await mapGirlsBcn(payload, new FakeTaxonomyResolver(), { now: NOW });
});

describe('mapGirlsBcn — camila105', () => {
  describe('identity', () => {
    it('id includes source prefix', () => expect(sp.id).toMatch(/^girlsbcn:/));
    it('id includes sourceId slug', () => expect(sp.id).toContain('gbcamila105'));
    it('nickname matches', () => expect(sp.nickname).toBe('Camila'));
    it('vertical is dating', () => expect(sp.vertical).toBe('dating'));
    it('category is escorts', () => expect(sp.category).toBe('escorts'));
    it('active is true', () => expect(sp.active).toBe(true));
  });

  describe('externalRefs', () => {
    it('has one externalRef', () => expect(sp.externalRefs).toHaveLength(1));
    it('source is girlsbcn', () => expect(sp.externalRefs[0]!.source).toBe('girlsbcn'));
    it('sourceId is derived from URL', () =>
      expect(sp.externalRefs[0]!.sourceId).toBe('gbcamila105'));
    it('sourceUrl is preserved', () => expect(sp.externalRefs[0]!.sourceUrl).toBe(SOURCE_URL));
  });

  describe('personalDetails', () => {
    it('age is 25', () => expect(sp.personalDetails.ageYears).toBe(25));
    it('height is 160', () => expect(sp.personalDetails.heightCm).toBe(160));
    it('weight is 55', () => expect(sp.personalDetails.weightKg).toBe(55));
    it('bust is 80', () => expect(sp.personalDetails.bustCm).toBe(80));
    it('waist is 60', () => expect(sp.personalDetails.waistCm).toBe(60));
    it('hip is 95', () => expect(sp.personalDetails.hipCm).toBe(95));
    it('nationalityId resolved', () =>
      expect(sp.personalDetails.nationalityId).toContain('colombiana'));
    it('hairId resolved', () => expect(sp.personalDetails.hairId).toContain('negro'));
    it('eyesId resolved', () => expect(sp.personalDetails.eyesId).toContain('marrones'));
  });

  describe('baseCity', () => {
    it('cityId resolved', () => expect(sp.baseCity?.id).toContain('barcelona'));
  });

  describe('meetingPlaces', () => {
    it('incall detected from bio', () => expect(sp.meetingPlaces.incall).toBe(true));
    it('outcall detected from bio', () => expect(sp.meetingPlaces.outcall).toBe(true));
  });

  describe('contact', () => {
    it('phone set', () => expect(sp.phoneNumber).toBeTruthy());
    it('contactOptions include calls', () => expect(sp.contactOptions).toContain('calls'));
    it('contactOptions include whatsapp', () => expect(sp.contactOptions).toContain('whatsapp'));
  });

  describe('photos', () => {
    it('at least 2 photos mapped', () => expect(sp.photos.length).toBeGreaterThanOrEqual(2));
    it('first photo isPrimary', () => expect(sp.photos[0]!.isPrimary).toBe(true));
    it('photos have order', () => sp.photos.forEach((p, i) => expect(p.order).toBe(i)));
  });

  describe('attributes', () => {
    it('priceRange is 1', () => expect(sp.attributes['priceRange']).toBe(1));
    it('schedule is Full time', () => expect(sp.attributes['schedule']).toBe('Full time'));
    it('videoUrl set', () => expect(sp.attributes['videoUrl']).toMatch(/\.mp4/));
  });

  describe('statistics', () => {
    it('videoCount is 1', () => expect(sp.statistics!.videoCount).toBe(1));
    it('photoCount matches photos array', () =>
      expect(sp.statistics!.photoCount).toBe(sp.photos.length));
  });

  describe('metadata', () => {
    it('source is girlsbcn', () => expect(sp.metadata['source']).toBe('girlsbcn'));
    it('adapterVersion is v2', () => expect(sp.metadata['adapterVersion']).toBe('v2'));
  });

  describe('timestamps', () => {
    it('createdAt matches now', () => expect(sp.createdAt).toBe(NOW.toISOString()));
    it('lastScrapedAt matches now', () => expect(sp.lastScrapedAt).toBe(NOW.toISOString()));
  });
});

describe('mapGirlsBcnLike — source discrimination', () => {
  it('uses girlsbcn source when called with GIRLSBCN_SOURCE', async () => {
    const html = loadHtmlFixture('camila105.html');
    const payload = extractGirlsBcn(html, SOURCE_URL);
    const result = await mapGirlsBcnLike(payload, GIRLSBCN_SOURCE, new FakeTaxonomyResolver());
    expect(result.externalRefs[0]!.source).toBe('girlsbcn');
  });

  it('uses girlsmadrid source when called with GIRLSMADRID_SOURCE', async () => {
    const html = loadHtmlFixture('camila105.html');
    const payload = extractGirlsBcn(html, SOURCE_URL);
    const result = await mapGirlsBcnLike(payload, GIRLSMADRID_SOURCE, new FakeTaxonomyResolver());
    expect(result.externalRefs[0]!.source).toBe('girlsmadrid');
  });
});

describe('mapGirlsBcn — taxonomy misses', () => {
  it('nationalityId undefined on miss', async () => {
    const html = loadHtmlFixture('camila105.html');
    const payload = extractGirlsBcn(html, SOURCE_URL);
    const result = await mapGirlsBcn(
      payload,
      new FakeTaxonomyResolver({
        misses: { nationality: new Set(['colombiana']) },
      }),
    );
    expect(result.personalDetails.nationalityId).toBeUndefined();
  });

  it('cityId undefined on miss', async () => {
    const html = loadHtmlFixture('camila105.html');
    const payload = extractGirlsBcn(html, SOURCE_URL);
    const result = await mapGirlsBcn(
      payload,
      new FakeTaxonomyResolver({
        misses: { city: new Set(['barcelona']) },
      }),
    );
    expect(result.baseCity).toBeUndefined();
  });
});
