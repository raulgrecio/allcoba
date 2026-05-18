import { describe, expect, it } from 'vitest';

import { extractDestacamos } from '#infrastructure/adapters/sources/dating/destacamos/destacamos.extractor.js';
import { mapDestacamos } from '#infrastructure/adapters/sources/dating/destacamos/destacamos.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { listHtmlFixtures, loadHtmlFixture } from './helpers/load-fixtures.js';

const FIXTURE_FILE = '92345_elena.html';
const FIXTURE_URL = 'https://www.destacamos.net/92345-elena-escort-madrid.html';

describe('destacamos pipeline — HTML → ScrapedProvider', () => {
  it('full pipeline produces valid ScrapedProvider', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractDestacamos(html, FIXTURE_URL);
    const sp = await mapDestacamos(payload, new FakeTaxonomyResolver());

    expect(sp.id).toContain('destacamos');
    expect(sp.vertical).toBe('dating');
    expect(sp.nickname).toBe('Elena');
    expect(sp.externalRefs[0]?.source).toBe('destacamos');
    expect(sp.externalRefs[0]?.sourceId).toBe('92345');
  });

  it('city resolved from #details Ciudad row', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractDestacamos(html, FIXTURE_URL);
    const sp = await mapDestacamos(payload, new FakeTaxonomyResolver());

    expect(sp.baseCity?.id).toContain('madrid');
  });

  it('height mapped from heightRaw', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractDestacamos(html, FIXTURE_URL);
    const sp = await mapDestacamos(payload, new FakeTaxonomyResolver());

    expect(sp.personalDetails.heightCm).toBe(160);
  });

  it('isPremium → vip badge', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractDestacamos(html, FIXTURE_URL);
    const sp = await mapDestacamos(payload, new FakeTaxonomyResolver());

    expect(sp.badges.vip).toBe(true);
  });

  it('4 photos from gallery', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractDestacamos(html, FIXTURE_URL);
    const sp = await mapDestacamos(payload, new FakeTaxonomyResolver());

    expect(sp.photos).toHaveLength(4);
    expect(sp.photos[0]!.isPrimary).toBe(true);
  });
});

describe('destacamos pipeline — all fixtures round-trip', () => {
  const fixtures = listHtmlFixtures();
  const resolver = new FakeTaxonomyResolver();

  for (const filename of fixtures) {
    it(`${filename} round-trips without error`, async () => {
      const html = loadHtmlFixture(filename);
      const url = `https://www.destacamos.net/92345-test.html`;
      const payload = extractDestacamos(html, url);
      const sp = await mapDestacamos(payload, resolver);

      expect(sp.vertical).toBe('dating');
      expect(sp.externalRefs[0]?.source).toBe('destacamos');
    });
  }
});
