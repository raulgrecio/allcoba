import { describe, expect, it } from 'vitest';

import { extractMilpasiones } from '#infrastructure/adapters/sources/dating/milpasiones/milpasiones.extractor.js';
import { mapMilpasiones } from '#infrastructure/adapters/sources/dating/milpasiones/milpasiones.mapper.js';
import { MilpasionesPipeline } from '#infrastructure/adapters/sources/dating/milpasiones/milpasiones.pipeline.js';

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

    expect(sp.baseCity?.id).toContain('estepona');
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

describe('MilpasionesPipeline class methods', () => {
  const pipeline = new MilpasionesPipeline();

  it('identifier is milpasiones', () => {
    expect(pipeline.identifier).toBe('milpasiones');
  });

  it('canHandle milpasiones.com URLs', () => {
    expect(pipeline.canHandle('https://milpasiones.com/anuncio/662583238_215990/')).toBe(true);
    expect(pipeline.canHandle('https://other.com')).toBe(false);
  });

  it('isProfileUrl \u2014 /anuncio/ URL is a profile', () => {
    expect(
      pipeline.isProfileUrl('https://milpasiones.com/anuncio/662583238-elena_215990/'),
    ).toBe(true);
  });

  it('isProfileUrl \u2014 listing URL is not a profile', () => {
    expect(pipeline.isProfileUrl('https://milpasiones.com/escorts/madrid/')).toBe(false);
  });

  it('extractNextPageUrl \u2014 link[rel=next] href resolves to absolute URL', () => {
    const html = '<html><head><link rel="next" href="/escorts/madrid/?pag=2"></head><body></body></html>';
    const next = pipeline.extractNextPageUrl(html, 'https://milpasiones.com/escorts/madrid/');
    expect(next).toBe('https://milpasiones.com/escorts/madrid/?pag=2');
  });

  it('extractNextPageUrl \u2014 no link + no pag param \u2192 appends ?pag=2', () => {
    const html = '<html><body></body></html>';
    const next = pipeline.extractNextPageUrl(html, 'https://milpasiones.com/escorts/madrid/');
    expect(next).toBe('https://milpasiones.com/escorts/madrid/?pag=2');
  });

  it('extractNextPageUrl \u2014 no link + existing pag param \u2192 increments pag', () => {
    const html = '<html><body></body></html>';
    const next = pipeline.extractNextPageUrl(
      html,
      'https://milpasiones.com/escorts/madrid/?pag=3',
    );
    expect(next).toBe('https://milpasiones.com/escorts/madrid/?pag=4');
  });

  it('extractNextPageUrl — no link + URL already has query string → appends &pag=2', () => {
    const html = '<html><body></body></html>';
    const next = pipeline.extractNextPageUrl(
      html,
      'https://milpasiones.com/escorts/madrid/?ciudad=barcelona',
    );
    expect(next).toBe('https://milpasiones.com/escorts/madrid/?ciudad=barcelona&pag=2');
  });

  it('extractNextPageUrl — link rel=next is invalid URL, catches and falls through', () => {
    const html = '<html><head><link rel="next" href="http://[invalid-url]"></head><body></body></html>';
    const next = pipeline.extractNextPageUrl(html, 'https://milpasiones.com/escorts/madrid/');
    expect(next).toBe('https://milpasiones.com/escorts/madrid/?pag=2');
  });

  it('extractNextPageUrl — invalid baseUrl (no query string) handles throw in new URL', () => {
    const html = '<html><body></body></html>';
    const next = pipeline.extractNextPageUrl(html, 'invalid-url-no-protocol');
    expect(next).toBe('invalid-url-no-protocol?pag=2');
  });

  it('extractNextPageUrl — invalid baseUrl (with query string) handles throw in new URL', () => {
    const html = '<html><body></body></html>';
    const next = pipeline.extractNextPageUrl(html, 'invalid-url-no-protocol?x=1');
    expect(next).toBe('invalid-url-no-protocol?x=1&pag=2');
  });


  it('extract and map methods work correctly via pipeline instance', async () => {
    const html = '<html><body><h1 class="pub-title">662583238 NATALIA</h1></body></html>';
    const payload = pipeline.extract(html, 'https://milpasiones.com/anuncio/662583238-elena_215990/');
    expect(payload.phone).toBe('662583238');
    const sp = await pipeline.map(payload, new FakeTaxonomyResolver());
    expect(sp.vertical).toBe('dating');
  });
});
