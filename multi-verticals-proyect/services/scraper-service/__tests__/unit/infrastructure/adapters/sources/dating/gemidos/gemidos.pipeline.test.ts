import { describe, expect, it } from 'vitest';

import { extractGemidos } from '#infrastructure/adapters/sources/dating/gemidos/gemidos.extractor.js';
import {
  GEMIDOS_SOURCE,
  mapGemidos,
} from '#infrastructure/adapters/sources/dating/gemidos/gemidos.mapper.js';
import { GemidosPipeline } from '#infrastructure/adapters/sources/dating/gemidos/gemidos.pipeline.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://gemidos.tv/anuncio/lucia-escort-madrid/';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('gemidos pipeline — HTML → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('lucia_escort-madrid.html');
    const payload = extractGemidos(html, SOURCE_URL);
    const sp = await mapGemidos(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(GEMIDOS_SOURCE);
    expect(sp.nickname).toBe('Lucia');
    expect(sp.phoneNumber).toBe('633445566');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.photos).toHaveLength(2);
    expect(sp.badges.verified).toBe(true);
    expect(sp.personalDetails.ageYears).toBe(26);
    expect(sp.externalRefs[0]?.source).toBe(GEMIDOS_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});

describe('GemidosPipeline class methods', () => {
  const pipeline = new GemidosPipeline();

  it('identifier is gemidos', () => {
    expect(pipeline.identifier).toBe('gemidos');
  });

  it('canHandle gemidos.tv URLs', () => {
    expect(pipeline.canHandle('https://gemidos.tv/anitta-brasil')).toBe(true);
    expect(pipeline.canHandle('https://other.com/profile')).toBe(false);
  });

  it('isProfileUrl — single slug is a profile', () => {
    expect(pipeline.isProfileUrl('https://gemidos.tv/anitta-brasil')).toBe(true);
    expect(pipeline.isProfileUrl('https://gemidos.tv/pau-535603')).toBe(true);
  });

  it('isProfileUrl — known sections not a profile', () => {
    expect(pipeline.isProfileUrl('https://gemidos.tv/escorts')).toBe(false);
    expect(pipeline.isProfileUrl('https://gemidos.tv/login')).toBe(false);
    expect(pipeline.isProfileUrl('https://gemidos.tv/registrate')).toBe(false);
  });

  it('isProfileUrl — multi-segment path not a profile', () => {
    expect(pipeline.isProfileUrl('https://gemidos.tv/espana/madrid')).toBe(false);
  });

  it('isProfileUrl — espana-prefixed slug not a profile', () => {
    expect(pipeline.isProfileUrl('https://gemidos.tv/espana-comunidad-de-madrid')).toBe(false);
  });

  it('extractProfileLinks — extracts listing card links', () => {
    const baseUrl = 'https://gemidos.tv/escorts';
    const html = `<html><body>
      <div class="listing-pub">
        <a class="listing-link" href="/anitta-brasil">Anitta</a>
        <a class="listing-link" href="https://gemidos.tv/pau-535603">Pau</a>
      </div>
      <a href="/otra-cosa">no es card</a>
    </body></html>`;
    const links = pipeline.extractProfileLinks(html, baseUrl);
    expect(links).toContain('https://gemidos.tv/anitta-brasil');
    expect(links).toContain('https://gemidos.tv/pau-535603');
    expect(links).not.toContain('https://gemidos.tv/otra-cosa');
  });

  it('extractProfileLinks — skips invalid hrefs without crash', () => {
    const html = '<html><body><a class="listing-link" href=":::bad">x</a></body></html>';
    expect(() => pipeline.extractProfileLinks(html, 'https://gemidos.tv')).not.toThrow();
  });

  it('extractProfileLinks — skips external domains', () => {
    const html =
      '<html><body><a class="listing-link" href="https://other.com/p">x</a></body></html>';
    const links = pipeline.extractProfileLinks(html, 'https://gemidos.tv');
    expect(links).toHaveLength(0);
  });

  it('getCrawlerOptions includes cookieSelectors and ageGateSelectors', () => {
    const opts = pipeline.getCrawlerOptions('https://gemidos.tv/escorts');
    expect(Array.isArray(opts.cookieSelectors)).toBe(true);
    expect(opts.cookieSelectors!.length).toBeGreaterThan(0);
    expect(Array.isArray(opts.ageGateSelectors)).toBe(true);
    expect(opts.ageGateSelectors!.length).toBeGreaterThan(0);
  });

  it('extractNextPageUrl — default rel=next logic (no next link → undefined)', () => {
    const html = '<html><body><p>no pagination</p></body></html>';
    expect(pipeline.extractNextPageUrl(html, 'https://gemidos.tv/escorts')).toBeUndefined();
  });
});
