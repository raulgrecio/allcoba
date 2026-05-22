import { describe, expect, it } from 'vitest';

import { NullTaxonomyResolver } from '#infrastructure/adapters/catalog/null-taxonomy-resolver.js';
import { extractDiscovery } from '#infrastructure/adapters/sources/general/discovery/discovery.extractor.js';
import {
  DISCOVERY_SOURCE,
  mapDiscovery,
} from '#infrastructure/adapters/sources/general/discovery/discovery.mapper.js';
import { hashUrl } from '#infrastructure/adapters/sources/general/discovery/discovery.parsers.js';
import { DiscoveryPipeline } from '#infrastructure/adapters/sources/general/discovery/discovery.pipeline.js';

const BASE = 'https://example.com/profile/42';
const resolver = new NullTaxonomyResolver();

// ============================================================================
// parsers
// ============================================================================
describe('hashUrl', () => {
  it('returns string with disc_ prefix', () => {
    const h = hashUrl(BASE);
    expect(h).toMatch(/^disc_/);
  });

  it('is stable — same URL always returns same hash', () => {
    expect(hashUrl(BASE)).toBe(hashUrl(BASE));
  });

  it('different URLs produce different hashes', () => {
    expect(hashUrl(BASE)).not.toBe(hashUrl('https://other.com/page/1'));
  });

  it('contains only alphanumeric chars after prefix', () => {
    const h = hashUrl(BASE);
    expect(h).toMatch(/^disc_[a-zA-Z0-9]+$/);
  });
});

// ============================================================================
// extractor
// ============================================================================
describe('extractDiscovery', () => {
  it('extracts title from <title> tag', () => {
    const html = '<html><head><title>Mi Título</title></head><body></body></html>';
    const p = extractDiscovery(html, BASE);
    expect(p.title).toBe('Mi Título');
  });

  it('falls back to h1 when no <title>', () => {
    const html = '<html><head></head><body><h1>Título H1</h1></body></html>';
    const p = extractDiscovery(html, BASE);
    expect(p.title).toBe('Título H1');
  });

  it('uses "Sin título" when no title or h1', () => {
    const p = extractDiscovery('<html><body></body></html>', BASE);
    expect(p.title).toBe('Sin título');
  });

  it('extracts description from meta[name=description]', () => {
    const html =
      '<html><head><meta name="description" content="Descripción meta"></head><body></body></html>';
    const p = extractDiscovery(html, BASE);
    expect(p.description).toBe('Descripción meta');
  });

  it('extracts description from og:description when no name=description', () => {
    const html =
      '<html><head><meta property="og:description" content="OG desc"></head><body></body></html>';
    const p = extractDiscovery(html, BASE);
    expect(p.description).toBe('OG desc');
  });

  it('description undefined when absent', () => {
    const p = extractDiscovery('<html><body></body></html>', BASE);
    expect(p.description).toBeUndefined();
  });

  it('extracts og:image as photo', () => {
    const html =
      '<html><head><meta property="og:image" content="https://cdn.example.com/img.jpg"></head><body></body></html>';
    const p = extractDiscovery(html, BASE);
    expect(p.photos).toHaveLength(1);
    expect(p.photos[0]!.url).toBe('https://cdn.example.com/img.jpg');
  });

  it('resolves relative img src to absolute', () => {
    const html = '<html><body><article><img src="/images/foto.jpg"></article></body></html>';
    const p = extractDiscovery(html, BASE);
    expect(p.photos[0]!.url).toBe('https://example.com/images/foto.jpg');
  });

  it('deduplicates photos', () => {
    const html = `<html><head>
      <meta property="og:image" content="https://cdn.example.com/img.jpg">
    </head><body>
      <article><img src="https://cdn.example.com/img.jpg"></article>
    </body></html>`;
    const p = extractDiscovery(html, BASE);
    expect(p.photos).toHaveLength(1);
  });

  it('skips non-http URLs', () => {
    const html = '<html><body><main><img src="data:image/png;base64,abc"></main></body></html>';
    const p = extractDiscovery(html, BASE);
    expect(p.photos).toHaveLength(0);
  });

  it('skips invalid absolute-looking URLs without crashing', () => {
    // javascript: URLs are not http/https → filtered out
    const html = '<html><body><main><img src="javascript:void(0)"></main></body></html>';
    const p = extractDiscovery(html, BASE);
    expect(p.photos).toHaveLength(0);
  });

  it('extracts data-src attribute', () => {
    const html =
      '<html><body><article><img data-src="https://cdn.example.com/lazy.jpg"></article></body></html>';
    const p = extractDiscovery(html, BASE);
    expect(p.photos[0]!.url).toBe('https://cdn.example.com/lazy.jpg');
  });

  it('sourceId uses hashUrl of sourceUrl', () => {
    const p = extractDiscovery('<html><body></body></html>', BASE);
    expect(p.sourceId).toBe(hashUrl(BASE));
  });

  it('sourceUrl matches input', () => {
    const p = extractDiscovery('<html><body></body></html>', BASE);
    expect(p.sourceUrl).toBe(BASE);
  });
});

// ============================================================================
// mapper
// ============================================================================
describe('mapDiscovery', () => {
  const payload = extractDiscovery(
    '<html><head><title>Test</title><meta name="description" content="Desc"><meta property="og:image" content="https://cdn.example.com/img.jpg"></head></html>',
    BASE,
  );

  it('vertical is general', async () => {
    const sp = await mapDiscovery(payload, resolver);
    expect(sp.vertical).toBe('general');
  });

  it('title from payload', async () => {
    const sp = await mapDiscovery(payload, resolver);
    expect(sp.title).toBe('Test');
  });

  it('externalRef source is discovery', async () => {
    const sp = await mapDiscovery(payload, resolver);
    expect(sp.externalRefs[0]!.source).toBe(DISCOVERY_SOURCE);
  });

  it('photos mapped with isPrimary first', async () => {
    const sp = await mapDiscovery(payload, resolver);
    expect(sp.photos[0]!.isPrimary).toBe(true);
  });

  it('description mapped as i18n object', async () => {
    const sp = await mapDiscovery(payload, resolver);
    expect(sp.description).toBeDefined();
    expect(typeof sp.description).toBe('object');
  });

  it('no description when payload.description undefined', async () => {
    const emptyPayload = extractDiscovery('<html><body></body></html>', BASE);
    const sp = await mapDiscovery(emptyPayload, resolver);
    expect(sp.description).toBeUndefined();
  });

  it('confidence is low (0.5)', async () => {
    const sp = await mapDiscovery(payload, resolver);
    expect(sp.confidence as number).toBe(0.5);
  });

  it('attributes.isDiscovery = true', async () => {
    const sp = await mapDiscovery(payload, resolver);
    expect((sp.attributes as Record<string, unknown>).isDiscovery).toBe(true);
  });

  it('respects options.now', async () => {
    const now = new Date('2025-06-01T10:00:00Z');
    const sp = await mapDiscovery(payload, resolver, { now });
    expect(sp.createdAt).toBe('2025-06-01T10:00:00.000Z');
  });

  it('statistics.photoCount matches photos length', async () => {
    const sp = await mapDiscovery(payload, resolver);
    expect(sp.statistics!.photoCount).toBe(sp.photos.length);
  });
});

// ============================================================================
// pipeline
// ============================================================================
describe('DiscoveryPipeline', () => {
  const pipeline = new DiscoveryPipeline();

  it('identifier is discovery', () => {
    expect(pipeline.identifier).toBe('discovery');
  });

  it('canHandle returns true for any URL', () => {
    expect(pipeline.canHandle('https://example.com')).toBe(true);
    expect(pipeline.canHandle('https://anything.org/path?q=1')).toBe(true);
  });

  it('isProfileUrl returns true for any URL', () => {
    expect(pipeline.isProfileUrl('https://example.com/listing/1')).toBe(true);
  });

  it('isAllowed resolves true', async () => {
    await expect(pipeline.isAllowed()).resolves.toBe(true);
  });

  it('extract returns DiscoveryPayload', () => {
    const payload = pipeline.extract(
      '<html><head><title>T</title></head><body></body></html>',
      BASE,
    );
    expect(payload.title).toBe('T');
    expect(payload.sourceUrl).toBe(BASE);
  });

  it('map returns ScrapedListing with vertical general', async () => {
    const payload = pipeline.extract('<html><body></body></html>', BASE);
    const sp = await pipeline.map(payload, resolver);
    expect(sp.vertical).toBe('general');
  });
});
