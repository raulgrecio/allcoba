import { describe, expect, it } from 'vitest';

import { extractMilescorts } from '#infrastructure/adapters/sources/dating/milescorts/milescorts.extractor.js';
import { mapMilescorts } from '#infrastructure/adapters/sources/dating/milescorts/milescorts.mapper.js';
import { MilescortsPipeline } from '#infrastructure/adapters/sources/dating/milescorts/milescorts.pipeline.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { listHtmlFixtures, loadHtmlFixture } from './helpers/load-fixtures.js';

const FIXTURE_FILE = '631594827_396681.html';
const FIXTURE_URL =
  'https://www.milescorts.es/escorts-y-putas/madrid-ciudad/631594827-escort-sexy-en-tu-zona-396681.htm';

describe('milescorts pipeline — HTML → ScrapedProvider', () => {
  it('full pipeline produces valid ScrapedProvider', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractMilescorts(html, FIXTURE_URL);
    const sp = await mapMilescorts(payload, new FakeTaxonomyResolver());

    expect(sp.id).toContain('milescorts');
    expect(sp.vertical).toBe('dating');
    expect(sp.nickname).toBe('Tania');
    expect(sp.externalRefs[0]?.source).toBe('milescorts');
    expect(sp.externalRefs[0]?.sourceId).toBe('396681');
  });

  it('city resolved from URL path segment', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractMilescorts(html, FIXTURE_URL);
    const sp = await mapMilescorts(payload, new FakeTaxonomyResolver());

    expect(sp.baseCity?.id).toContain('madrid-ciudad');
  });

  it('phone from URL filename first digit segment', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractMilescorts(html, FIXTURE_URL);

    expect(payload.phone).toBe('631594827');
  });

  it('sourceId = numeric ad ID from filename end', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractMilescorts(html, FIXTURE_URL);

    expect(payload.sourceId).toBe('396681');
  });

  it('isVerified badge propagated to ScrapedProvider', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractMilescorts(html, FIXTURE_URL);
    const sp = await mapMilescorts(payload, new FakeTaxonomyResolver());

    expect(sp.badges.verified).toBe(true);
  });
});

describe('milescorts pipeline — all fixtures round-trip', () => {
  const fixtures = listHtmlFixtures();
  const resolver = new FakeTaxonomyResolver();

  for (const filename of fixtures) {
    it(`${filename} round-trips without error`, async () => {
      const html = loadHtmlFixture(filename);
      const url = `https://www.milescorts.es/escorts-y-putas/madrid-ciudad/${filename}`;
      const payload = extractMilescorts(html, url);
      const sp = await mapMilescorts(payload, resolver);

      expect(sp.vertical).toBe('dating');
      expect(sp.externalRefs[0]?.source).toBe('milescorts');
    });
  }
});

describe('MilescortsPipeline class methods', () => {
  const pipeline = new MilescortsPipeline();

  it('identifier is milescorts', () => {
    expect(pipeline.identifier).toBe('milescorts');
  });

  it('canHandle milescorts.es URLs', () => {
    expect(pipeline.canHandle('https://www.milescorts.es/escorts-y-putas/madrid/')).toBe(true);
    expect(pipeline.canHandle('https://other.com')).toBe(false);
  });

  it('isProfileUrl \u2014 .htm + /escorts-y-putas/ is a profile', () => {
    expect(
      pipeline.isProfileUrl(
        'https://www.milescorts.es/escorts-y-putas/madrid-ciudad/631594827-escort-396681.htm',
      ),
    ).toBe(true);
  });

  it('isProfileUrl \u2014 listing page is not a profile', () => {
    expect(
      pipeline.isProfileUrl('https://www.milescorts.es/escorts-y-putas/madrid-ciudad/'),
    ).toBe(false);
  });

  it('isProfileUrl \u2014 .htm without /escorts-y-putas/ is not a profile', () => {
    expect(pipeline.isProfileUrl('https://www.milescorts.es/otras/396681.htm')).toBe(false);
  });

  it('getCrawlerOptions includes cookie and age-gate selectors', () => {
    const opts = pipeline.getCrawlerOptions('https://www.milescorts.es/escorts-y-putas/');
    expect(opts.cookieSelectors).toContain('#cn-accept-cookie');
    expect(opts.ageGateSelectors).toContain('a.btn-success:contains("ENTRAR")');
  });
});
