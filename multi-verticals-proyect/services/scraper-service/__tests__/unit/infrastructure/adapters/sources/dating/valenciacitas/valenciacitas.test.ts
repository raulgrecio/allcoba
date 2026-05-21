import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  ValenciacitasPipeline,
  VALENCIACITAS_SOURCE,
} from '#infrastructure/adapters/sources/dating/valenciacitas/valenciacitas.pipeline.js';
import { extractMadrid69 } from '#infrastructure/adapters/sources/dating/madrid69/madrid69.extractor.js';
import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';

// valenciacitas reusa el HTML Next.js de madrid69 → fixture compartido
const MADRID69_FIXTURES = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'madrid69',
  'fixtures',
  'html',
);
const loadHtml = (name: string): string =>
  readFileSync(join(MADRID69_FIXTURES, name), 'utf8');

const SOURCE_URL =
  'https://www.valenciacitas.com/citas-chicas-valencia-44064-kheila-pura-ternura-644417235';
const NOW = new Date('2026-01-01T00:00:00.000Z');

const nullResolver = {
  resolveCity: async () => null,
  resolveNationality: async () => null,
  resolveEthnic: async () => null,
  resolveHair: async () => null,
  resolveEye: async () => null,
  resolveOrientation: async () => null,
} as unknown as TaxonomyResolverPort;

describe('ValenciacitasPipeline', () => {
  const pipeline = new ValenciacitasPipeline();

  it('identifier = valenciacitas', () => {
    expect(pipeline.identifier).toBe(VALENCIACITAS_SOURCE);
  });

  it('canHandle reconoce valenciacitas.com, no madrid69.com', () => {
    expect(pipeline.canHandle(SOURCE_URL)).toBe(true);
    expect(pipeline.canHandle('https://www.madrid69.com/citas-chicas-madrid-1-x')).toBe(false);
  });

  it('isProfileUrl acepta /citas-chicas-*', () => {
    expect(pipeline.isProfileUrl(SOURCE_URL)).toBe(true);
    expect(pipeline.isProfileUrl('https://www.valenciacitas.com/')).toBe(false);
  });

  it('extract + map produce un ScrapedProvider con fuente valenciacitas', async () => {
    const html = loadHtml('kheila_44064.html');
    const payload = pipeline.extract(html, SOURCE_URL);
    const sp = await pipeline.map(payload, nullResolver, { now: NOW });

    expect(sp.id).toContain(VALENCIACITAS_SOURCE);
    expect(sp.id).not.toContain('madrid69');
    expect(sp.vertical).toBe('dating');
    expect(sp.externalRefs[0]?.source).toBe(VALENCIACITAS_SOURCE);
    expect(sp.metadata.source).toBe(VALENCIACITAS_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });

  it('extract reusa el extractor de madrid69 (mismo payload)', () => {
    const html = loadHtml('kheila_44064.html');
    const viaPipeline = pipeline.extract(html, SOURCE_URL);
    const viaExtractor = extractMadrid69(html, SOURCE_URL);
    expect(viaPipeline).toEqual(viaExtractor);
  });
});
