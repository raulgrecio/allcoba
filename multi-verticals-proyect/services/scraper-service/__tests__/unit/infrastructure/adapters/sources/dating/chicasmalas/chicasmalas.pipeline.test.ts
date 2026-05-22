import { describe, expect, it } from 'vitest';

import { extractChicasmalas } from '#infrastructure/adapters/sources/dating/chicasmalas/chicasmalas.extractor.js';
import {
  CHICASMALAS_SOURCE,
  mapChicasmalas,
} from '#infrastructure/adapters/sources/dating/chicasmalas/chicasmalas.mapper.js';
import { ChicasmalasPipeline } from '#infrastructure/adapters/sources/dating/chicasmalas/chicasmalas.pipeline.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://www.chicasmalas.es/anuncios/sofia-deluxe/';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('ChicasmalasPipeline class methods', () => {
  const pipeline = new ChicasmalasPipeline();

  it('identifier is chicasmalas', () => {
    expect(pipeline.identifier).toBe('chicasmalas');
  });

  it('canHandle chicasmalas.es URLs', () => {
    expect(pipeline.canHandle('https://chicasmalas.es/anuncios/sofia/')).toBe(true);
    expect(pipeline.canHandle('https://other.com/page')).toBe(false);
  });

  it('isProfileUrl — /anuncios/{slug}/', () => {
    expect(pipeline.isProfileUrl('https://chicasmalas.es/anuncios/sofia-deluxe/')).toBe(true);
  });

  it('isProfileUrl — root listing not a profile', () => {
    expect(pipeline.isProfileUrl('https://chicasmalas.es/anuncios/')).toBe(false);
    expect(pipeline.isProfileUrl('https://chicasmalas.es/')).toBe(false);
  });

  it('extractProfileLinks — parses WP REST JSON with link fields', () => {
    const json = JSON.stringify([
      { link: 'https://chicasmalas.es/anuncios/ana/', id: 1 },
      { link: 'https://chicasmalas.es/anuncios/sofia/', id: 2 },
    ]);
    const html = `<html><body><pre>${json}</pre></body></html>`;
    const links = pipeline.extractProfileLinks(html);
    expect(links).toContain('https://chicasmalas.es/anuncios/ana/');
    expect(links).toContain('https://chicasmalas.es/anuncios/sofia/');
  });

  it('extractProfileLinks — returns [] for non-JSON response', () => {
    const html = '<html><body><p>Not JSON</p></body></html>';
    const links = pipeline.extractProfileLinks(html);
    expect(links).toHaveLength(0);
  });

  it('extractNextPageUrl — always returns undefined', () => {
    expect(pipeline.extractNextPageUrl('<html/>', 'https://chicasmalas.es')).toBeUndefined();
  });

  it('getCrawlerOptions includes cookieSelectors and ageGateSelectors', () => {
    const opts = pipeline.getCrawlerOptions('https://chicasmalas.es/anuncios/');
    expect(Array.isArray(opts.cookieSelectors)).toBe(true);
    expect(opts.cookieSelectors!.length).toBeGreaterThan(0);
    expect(Array.isArray(opts.ageGateSelectors)).toBe(true);
    expect(opts.ageGateSelectors!.length).toBeGreaterThan(0);
  });
});

describe('chicasmalas pipeline — Elementor HTML → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('sofia-deluxe.html');
    const payload = extractChicasmalas(html, SOURCE_URL);
    const sp = await mapChicasmalas(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(CHICASMALAS_SOURCE);
    expect(sp.nickname).toBeTruthy();
    expect(sp.contactOptions).toContain('whatsapp');
    expect(sp.photos.length).toBeGreaterThan(0);
    expect(sp.personalDetails.ageYears).toBe(22);
    expect(sp.personalDetails.heightCm).toBe(168);
    expect(sp.aboutMe?.original).toBeTruthy();
    expect(sp.externalRefs[0]?.source).toBe(CHICASMALAS_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
