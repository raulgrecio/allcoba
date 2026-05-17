import { describe, it, expect, beforeAll } from 'vitest';

import { extractErosguia } from '#infrastructure/adapters/sources/dating/erosguia/erosguia.extractor.js';
import { mapErosguia, EROSGUIA_SOURCE } from '#infrastructure/adapters/sources/dating/erosguia/erosguia.mapper.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtmlFixture } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://www.erosguia.com/55383.html';
const NOW = new Date('2026-05-18T12:00:00.000Z');

let sp: ScrapedProvider;

beforeAll(async () => {
  const html = loadHtmlFixture('anny_55383.html');
  const payload = extractErosguia(html, SOURCE_URL);
  sp = await mapErosguia(payload, new FakeTaxonomyResolver(), { now: NOW });
});

describe('mapErosguia — anny_55383 identity', () => {
  it('has valid id', () => expect(sp.id).toBeTruthy());
  it('vertical = dating', () => expect(sp.vertical).toBe('dating'));
  it('nickname = Anny', () => expect(sp.nickname).toBe('Anny'));
  it('source = erosguia', () => expect(sp.externalRefs[0]!.source).toBe(EROSGUIA_SOURCE));
  it('sourceId = 55383', () => expect(sp.externalRefs[0]!.sourceId).toBe('55383'));
  it('metadata.source = erosguia', () => expect(sp.metadata['source']).toBe('erosguia'));
  it('metadata.adapterVersion = v2', () => expect(sp.metadata['adapterVersion']).toBe('v2'));
});

describe('mapErosguia — personalDetails', () => {
  it('ageYears = 22', () => expect(sp.personalDetails.ageYears).toBe(22));
  it('heightCm = 160', () => expect(sp.personalDetails.heightCm).toBe(160));

  it('nationalityId contains colombiana', () =>
    expect(sp.personalDetails.nationalityId).toContain('colombiana'));

  it('nationalityId undefined on taxonomy miss', async () => {
    const html = loadHtmlFixture('anny_55383.html');
    const payload = extractErosguia(html, SOURCE_URL);
    const result = await mapErosguia(payload, new FakeTaxonomyResolver({
      misses: { nationality: new Set(['colombiana']) },
    }));
    expect(result.personalDetails.nationalityId).toBeUndefined();
  });
});

describe('mapErosguia — baseCity', () => {
  it('cityId contains madrid', () => expect(sp.baseCity?.cityId).toContain('madrid'));

  it('baseCity undefined on city taxonomy miss', async () => {
    const html = loadHtmlFixture('anny_55383.html');
    const payload = extractErosguia(html, SOURCE_URL);
    const result = await mapErosguia(payload, new FakeTaxonomyResolver({
      misses: { city: new Set(['madrid']) },
    }));
    expect(result.baseCity).toBeUndefined();
  });
});

describe('mapErosguia — contact', () => {
  it('contactOptions includes calls', () => expect(sp.contactOptions).toContain('calls'));
  it('contactOptions includes whatsapp', () => expect(sp.contactOptions).toContain('whatsapp'));
  it('contactOptions includes telegram', () => expect(sp.contactOptions).toContain('telegram'));

  it('telegram in otherPlatforms', () => {
    const tg = sp.otherPlatforms.find((p) => p.platform === 'telegram');
    expect(tg).toBeDefined();
    expect(tg!.url).toMatch(/t\.me/);
  });

  it('phoneNumber is set', () => expect(sp.phoneNumber).toBeTruthy());
});

describe('mapErosguia — photos', () => {
  it('photos present', () => expect(sp.photos.length).toBeGreaterThan(0));
  it('first photo isPrimary', () => expect(sp.photos[0]!.isPrimary).toBe(true));
  it('photos have eros.bz URLs', () =>
    sp.photos.forEach((p) => expect(p.url).toMatch(/eros\.bz/)));
});

describe('mapErosguia — attributes', () => {
  it('attributes.services includes Cenas Románticas', () => {
    const services = sp.attributes['services'] as string[];
    expect(services).toContain('Cenas Románticas');
  });

  it('attributes.services has 12 entries', () => {
    const services = sp.attributes['services'] as string[];
    expect(services.length).toBe(12);
  });
});

describe('mapErosguia — timestamps', () => {
  it('createdAt = NOW', () => expect(sp.createdAt).toBe(NOW.toISOString()));
  it('lastScrapedAt = NOW', () => expect(sp.lastScrapedAt).toBe(NOW.toISOString()));
});
