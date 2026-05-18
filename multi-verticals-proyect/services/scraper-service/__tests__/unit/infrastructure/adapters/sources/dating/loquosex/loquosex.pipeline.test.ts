import { describe, expect, it } from 'vitest';

import { extractLoquosex } from '#infrastructure/adapters/sources/dating/loquosex/loquosex.extractor.js';
import { mapLoquosex } from '#infrastructure/adapters/sources/dating/loquosex/loquosex.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { listHtmlFixtures, loadHtmlFixture } from './helpers/load-fixtures.js';

const FIXTURE_FILE = '677684329.html';
const FIXTURE_URL = 'https://loquosex.com/ven-a-conocerme-677684329.html/';

describe('loquosex pipeline — HTML → ScrapedProvider', () => {
  it('full pipeline produces valid ScrapedProvider', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractLoquosex(html, FIXTURE_URL);
    const sp = await mapLoquosex(payload, new FakeTaxonomyResolver());

    expect(sp.id).toContain('loquosex');
    expect(sp.vertical).toBe('dating');
    expect(sp.nickname).toBe('JOVEN Y GUAPA');
    expect(sp.externalRefs[0]?.source).toBe('loquosex');
    expect(sp.externalRefs[0]?.sourceId).toBe('677684329');
  });

  it('baseCity resolved from HTML city', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractLoquosex(html, FIXTURE_URL);
    const sp = await mapLoquosex(payload, new FakeTaxonomyResolver());

    expect(sp.baseCity?.id).toContain('murcia');
  });

  it('nationalityId resolved from HTML nationality', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractLoquosex(html, FIXTURE_URL);
    const sp = await mapLoquosex(payload, new FakeTaxonomyResolver());

    expect(sp.personalDetails.nationalityId).toContain('venezolana');
  });

  it('meetingPlaces incall+outcall from bio', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractLoquosex(html, FIXTURE_URL);
    const sp = await mapLoquosex(payload, new FakeTaxonomyResolver());

    expect(sp.meetingPlaces.incall).toBe(true);
    expect(sp.meetingPlaces.outcall).toBe(true);
  });

  it('photos deduplicated and ordered', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractLoquosex(html, FIXTURE_URL);
    const sp = await mapLoquosex(payload, new FakeTaxonomyResolver());

    expect(sp.photos.length).toBe(3);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    for (const p of sp.photos) {
      expect(p.url).not.toContain('?');
    }
  });
});

describe('loquosex pipeline — all fixtures round-trip', () => {
  const fixtures = listHtmlFixtures();
  const resolver = new FakeTaxonomyResolver();

  for (const filename of fixtures) {
    it(`${filename} round-trips without error`, async () => {
      const html = loadHtmlFixture(filename);
      const url = `https://loquosex.com/${filename}`;
      const payload = extractLoquosex(html, url);
      const sp = await mapLoquosex(payload, resolver);

      expect(sp.vertical).toBe('dating');
      expect(sp.externalRefs[0]?.source).toBe('loquosex');
    });
  }
});
