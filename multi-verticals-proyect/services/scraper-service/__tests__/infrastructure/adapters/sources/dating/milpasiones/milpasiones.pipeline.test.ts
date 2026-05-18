import { describe, expect, it } from 'vitest';

import { extractMilpasiones } from '#infrastructure/adapters/sources/dating/milpasiones/milpasiones.extractor.js';
import { mapMilpasiones } from '#infrastructure/adapters/sources/dating/milpasiones/milpasiones.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { listHtmlFixtures, loadHtmlFixture } from './helpers/load-fixtures.js';

const FIXTURE_FILE = '662583238_215990.html';
const FIXTURE_URL =
  'https://milpasiones.com/anuncio/662583238-carinosa-morbosa-muy-implicada_215990/';

describe('milpasiones pipeline — HTML → ScrapedProvider', () => {
  it('full pipeline produces valid ScrapedProvider', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractMilpasiones(html, FIXTURE_URL);
    const sp = await mapMilpasiones(payload, new FakeTaxonomyResolver());

    expect(sp.id).toContain('milpasiones');
    expect(sp.vertical).toBe('dating');
    expect(sp.nickname).toBe('NATALIA');
    expect(sp.externalRefs[0]?.source).toBe('milpasiones');
    expect(sp.externalRefs[0]?.sourceId).toBe('215990');
  });

  it('city from geo.placename meta tag', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractMilpasiones(html, FIXTURE_URL);
    const sp = await mapMilpasiones(payload, new FakeTaxonomyResolver());

    expect(sp.baseCity?.cityId).toContain('estepona');
  });

  it('phone from URL', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractMilpasiones(html, FIXTURE_URL);

    expect(payload.phone).toBe('662583238');
  });

  it('3 photos from og:image tags', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractMilpasiones(html, FIXTURE_URL);
    const sp = await mapMilpasiones(payload, new FakeTaxonomyResolver());

    expect(sp.photos).toHaveLength(3);
    expect(sp.photos[0]!.isPrimary).toBe(true);
  });

  it('confidence = low (JS body)', async () => {
    const html = loadHtmlFixture(FIXTURE_FILE);
    const payload = extractMilpasiones(html, FIXTURE_URL);
    const sp = await mapMilpasiones(payload, new FakeTaxonomyResolver());

    expect(sp.confidence).toBe(0.5);
  });
});

describe('milpasiones pipeline — all fixtures round-trip', () => {
  const fixtures = listHtmlFixtures();
  const resolver = new FakeTaxonomyResolver();

  for (const filename of fixtures) {
    it(`${filename} round-trips without error`, async () => {
      const html = loadHtmlFixture(filename);
      const url = `https://milpasiones.com/anuncio/662583238-slug_99999/`;
      const payload = extractMilpasiones(html, url);
      const sp = await mapMilpasiones(payload, resolver);

      expect(sp.vertical).toBe('dating');
      expect(sp.externalRefs[0]?.source).toBe('milpasiones');
    });
  }
});
