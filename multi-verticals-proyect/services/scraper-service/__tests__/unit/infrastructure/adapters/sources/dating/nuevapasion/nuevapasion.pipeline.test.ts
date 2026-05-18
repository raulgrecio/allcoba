import { describe, expect, it } from 'vitest';
import { extractNuevapasion } from '#infrastructure/adapters/sources/dating/nuevapasion/nuevapasion.extractor.js';
import { mapNuevapasion, NUEVAPASION_SOURCE } from '#infrastructure/adapters/sources/dating/nuevapasion/nuevapasion.mapper.js';
import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://nuevapasion.com/anuncio/sofia-abc123';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('nuevapasion pipeline — HTML → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('sofia_abc123.html');
    const payload = extractNuevapasion(html, SOURCE_URL);
    const sp = await mapNuevapasion(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(NUEVAPASION_SOURCE);
    expect(sp.nickname).toBe('Sofia');
    expect(sp.phoneNumber).toBe('655123456');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.photos).toHaveLength(2);
    expect(sp.externalRefs[0]?.source).toBe(NUEVAPASION_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
