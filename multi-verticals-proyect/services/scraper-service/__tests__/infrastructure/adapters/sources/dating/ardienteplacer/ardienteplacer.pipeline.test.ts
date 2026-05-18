import { describe, expect, it } from 'vitest';

import { extractArdienteplacer } from '#infrastructure/adapters/sources/dating/ardienteplacer/ardienteplacer.extractor.js';
import { mapArdienteplacer } from '#infrastructure/adapters/sources/dating/ardienteplacer/ardienteplacer.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { listHtmlFixtures, loadHtmlFixture } from './helpers/load-fixtures.js';

const FIXTURE_FILE = '632277902_92010.html';
const FIXTURE_URL =
  'https://www.ardienteplacer.com/index.php/escort/putas-guarras/madrid/632277902/92010';

describe('ardienteplacer pipeline — HTML → ScrapedProvider', () => {
  it('full pipeline produces valid ScrapedProvider', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractArdienteplacer(html, FIXTURE_URL);
    const sp = await mapArdienteplacer(payload, new FakeTaxonomyResolver());

    expect(sp.id).toContain('ardienteplacer');
    expect(sp.vertical).toBe('dating');
    expect(sp.nickname).toBe('Carmen');
    expect(sp.externalRefs[0]?.source).toBe('ardienteplacer');
    expect(sp.externalRefs[0]?.sourceId).toBe('92010');
  });

  it('city resolved from postcatblock', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractArdienteplacer(html, FIXTURE_URL);
    const sp = await mapArdienteplacer(payload, new FakeTaxonomyResolver());

    expect(sp.baseCity?.cityId).toContain('madrid');
  });

  it('rate mapped to prices', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractArdienteplacer(html, FIXTURE_URL);
    const sp = await mapArdienteplacer(payload, new FakeTaxonomyResolver());

    expect(sp.prices[0]).toMatchObject({ label: '1h', amount: 80 });
  });

  it('services in attributes', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractArdienteplacer(html, FIXTURE_URL);
    const sp = await mapArdienteplacer(payload, new FakeTaxonomyResolver());

    expect((sp.attributes as Record<string, unknown>).services).toHaveLength(4);
  });

  it('photos are full-size -g.jpg', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractArdienteplacer(html, FIXTURE_URL);
    const sp = await mapArdienteplacer(payload, new FakeTaxonomyResolver());

    expect(sp.photos.length).toBe(3);
    for (const p of sp.photos) {
      expect(p.url).toMatch(/-g\.jpg$/);
    }
  });
});

describe('ardienteplacer pipeline — all fixtures round-trip', () => {
  const fixtures = listHtmlFixtures();
  const resolver = new FakeTaxonomyResolver();

  for (const filename of fixtures) {
    it(`${filename} round-trips without error`, async () => {
      const html = loadHtmlFixture(filename);
      const url =
        'https://www.ardienteplacer.com/index.php/escort/cat/madrid/632277902/99999';
      const payload = extractArdienteplacer(html, url);
      const sp = await mapArdienteplacer(payload, resolver);

      expect(sp.vertical).toBe('dating');
      expect(sp.externalRefs[0]?.source).toBe('ardienteplacer');
    });
  }
});
