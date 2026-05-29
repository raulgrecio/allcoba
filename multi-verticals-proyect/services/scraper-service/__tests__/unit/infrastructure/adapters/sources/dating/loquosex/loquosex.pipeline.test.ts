import { describe, expect, it } from 'vitest';

import { extractLoquosex } from '#infrastructure/adapters/sources/dating/loquosex/loquosex.extractor.js';
import { mapLoquosex } from '#infrastructure/adapters/sources/dating/loquosex/loquosex.mapper.js';
import { LoquosexPipeline } from '#infrastructure/adapters/sources/dating/loquosex/loquosex.pipeline.js';

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

describe('LoquosexPipeline class methods', () => {
  const pipeline = new LoquosexPipeline();

  it('identifier is loquosex', () => {
    expect(pipeline.identifier).toBe('loquosex');
  });

  it('canHandle loquosex.com URLs', () => {
    expect(pipeline.canHandle('https://loquosex.com/perfil-123.html/')).toBe(true);
    expect(pipeline.canHandle('https://other.com/page')).toBe(false);
  });

  it('isProfileUrl \u2014 .html without /page/ is a profile', () => {
    expect(pipeline.isProfileUrl('https://loquosex.com/ven-a-conocerme-677684329.html/')).toBe(
      true,
    );
  });

  it('isProfileUrl \u2014 /page/ URL is not a profile', () => {
    expect(pipeline.isProfileUrl('https://loquosex.com/page/2.html')).toBe(false);
  });

  it('isProfileUrl \u2014 URL without .html is not a profile', () => {
    expect(pipeline.isProfileUrl('https://loquosex.com/escorts/madrid/')).toBe(false);
  });

  it('getCrawlerOptions includes cookie selectors', () => {
    const opts = pipeline.getCrawlerOptions('https://loquosex.com/escorts/');
    expect(opts.cookieSelectors).toContain('#cn-accept-cookie');
  });
});
