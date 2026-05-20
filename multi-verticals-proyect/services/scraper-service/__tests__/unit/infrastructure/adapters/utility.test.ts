/**
 * Tests for small utility classes that had 0% coverage:
 * NullTaxonomyResolver, InMemoryProviderRepository, country-resolver.
 */

import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';

import { asProviderId } from '@allcoba/shared-types';

import { NullTaxonomyResolver } from '#infrastructure/adapters/catalog/null-taxonomy-resolver.js';
import { InMemoryProviderRepository } from '#infrastructure/adapters/persistence/in-memory-provider.repository.js';
import { resolveCountryCode } from '#infrastructure/utils/country-resolver.js';
import { asConfidence, Confidence } from '#domain/canonical/confidence.js';
import { isDatingPipelinePort } from '#application/ports/dating-pipeline.port.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';

// ── NullTaxonomyResolver ──────────────────────────────────────────────────────

describe('NullTaxonomyResolver', () => {
  const r = new NullTaxonomyResolver();

  it('resolveCity returns null', async () => { expect(await r.resolveCity('madrid', 'ES')).toBeNull(); });
  it('resolveCountry returns null', async () => { expect(await r.resolveCountry('ES')).toBeNull(); });
  it('resolveNationality returns null', async () => { expect(await r.resolveNationality('spanish')).toBeNull(); });
  it('resolveEthnic returns null', async () => { expect(await r.resolveEthnic('latina')).toBeNull(); });
  it('resolveHair returns null', async () => { expect(await r.resolveHair('brown')).toBeNull(); });
  it('resolveEye returns null', async () => { expect(await r.resolveEye('blue')).toBeNull(); });
  it('resolveOrientation returns null', async () => { expect(await r.resolveOrientation('straight')).toBeNull(); });
});

// ── InMemoryProviderRepository ────────────────────────────────────────────────

const makeProvider = (overrides: Partial<ScrapedProvider> = {}): ScrapedProvider => ({
  id: asProviderId(randomUUID()),
  vertical: 'dating',
  nickname: 'Test',
  active: true,
  humanVerified: false,
  badges: { vip: false, verified: false, trans: false, pornstar: false },
  verificationStatus: 'pending_review',
  meetingPlaces: { incall: false, outcall: false },
  contactOptions: [],
  personalDetails: { ageYears: 25, spokenLanguageCodes: [], meetingWith: [] },
  prices: [],
  tours: [],
  photos: [],
  links: {},
  otherPlatforms: [],
  reviewsEnabled: false,
  reviewsCount: 0,
  reviewsRating: 0,
  reviews: [],
  externalRefs: [{ source: 'test', sourceId: 'id-1' }],
  signals: [],
  confidence: asConfidence(0.9),
  images: [],
  attributes: {},
  metadata: {},
  lastScrapedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('InMemoryProviderRepository', () => {
  it('create + findById', async () => {
    const repo = new InMemoryProviderRepository();
    const p = makeProvider();
    await repo.create(p);
    const found = await repo.findById(p.id);
    expect(found?.id).toBe(p.id);
  });

  it('findById returns null when not found', async () => {
    const repo = new InMemoryProviderRepository();
    expect(await repo.findById(asProviderId(randomUUID()))).toBeNull();
  });

  it('findByExternalRef finds provider', async () => {
    const repo = new InMemoryProviderRepository();
    const p = makeProvider();
    await repo.create(p);
    const found = await repo.findByExternalRef({ source: 'test', sourceId: 'id-1' });
    expect(found?.id).toBe(p.id);
  });

  it('findByExternalRef returns null when not found', async () => {
    const repo = new InMemoryProviderRepository();
    expect(await repo.findByExternalRef({ source: 'x', sourceId: 'y' })).toBeNull();
  });

  it('find by phoneNumber', async () => {
    const repo = new InMemoryProviderRepository();
    const p = makeProvider({ phoneNumber: '+34612345678' as any });
    await repo.create(p);
    const results = await repo.find({ vertical: 'dating', phoneNumber: '+34612345678' as any });
    expect(results).toHaveLength(1);
  });

  it('find by imageHash', async () => {
    const repo = new InMemoryProviderRepository();
    const p = makeProvider({ images: [{ hash: 'abc' as any, storedUrl: 'https://r2.com/img.jpg', originalUrl: 'https://src.com/img.jpg' }] });
    await repo.create(p);
    const results = await repo.find({ vertical: 'dating', imageHash: 'abc' as any });
    expect(results).toHaveLength(1);
  });

  it('find by externalRef', async () => {
    const repo = new InMemoryProviderRepository();
    const p = makeProvider();
    await repo.create(p);
    const results = await repo.find({ vertical: 'dating', externalRef: { source: 'test', sourceId: 'id-1' } });
    expect(results).toHaveLength(1);
  });

  it('find returns empty for wrong vertical', async () => {
    const repo = new InMemoryProviderRepository();
    const p = makeProvider({ vertical: 'dating' });
    await repo.create(p);
    const results = await repo.find({ vertical: 'general', externalRef: { source: 'test', sourceId: 'id-1' } });
    expect(results).toHaveLength(0);
  });

  it('update by externalRef', async () => {
    const repo = new InMemoryProviderRepository();
    const p = makeProvider();
    await repo.create(p);
    const updated = { ...p, nickname: 'Updated' };
    await repo.update({ source: 'test', sourceId: 'id-1' }, updated);
    const found = await repo.findById(p.id);
    expect(found?.nickname).toBe('Updated');
  });

  it('update does nothing when not found', async () => {
    const repo = new InMemoryProviderRepository();
    const p = makeProvider();
    await expect(repo.update({ source: 'none', sourceId: 'none' }, p)).resolves.not.toThrow();
  });

  it('updateById overwrites provider', async () => {
    const repo = new InMemoryProviderRepository();
    const p = makeProvider();
    await repo.create(p);
    const updated = { ...p, nickname: 'ById' };
    await repo.updateById(p.id, updated);
    const found = await repo.findById(p.id);
    expect(found?.nickname).toBe('ById');
  });
});

// ── Confidence value object ───────────────────────────────────────────────────

describe('asConfidence', () => {
  it('creates valid confidence', () => {
    expect(asConfidence(0.5)).toBe(0.5);
    expect(asConfidence(0)).toBe(0);
    expect(asConfidence(1)).toBe(1);
  });

  it('throws for negative', () => {
    expect(() => asConfidence(-0.1)).toThrow(RangeError);
  });

  it('throws for > 1', () => {
    expect(() => asConfidence(1.1)).toThrow(RangeError);
  });

  it('throws for NaN', () => {
    expect(() => asConfidence(NaN)).toThrow(RangeError);
  });

  it('throws for Infinity', () => {
    expect(() => asConfidence(Infinity)).toThrow(RangeError);
  });
});

describe('Confidence constants', () => {
  it('high = 0.95', () => { expect(Confidence.high).toBe(0.95); });
  it('medium = 0.8', () => { expect(Confidence.medium).toBe(0.8); });
  it('low = 0.5', () => { expect(Confidence.low).toBe(0.5); });

  it('isHigh true for >= 0.9', () => { expect(Confidence.isHigh(asConfidence(0.95))).toBe(true); });
  it('isHigh false for < 0.9', () => { expect(Confidence.isHigh(asConfidence(0.5))).toBe(false); });

  it('isMedium true for 0.7-0.89', () => { expect(Confidence.isMedium(asConfidence(0.8))).toBe(true); });
  it('isMedium false for < 0.7', () => { expect(Confidence.isMedium(asConfidence(0.5))).toBe(false); });
  it('isMedium false for >= 0.9', () => { expect(Confidence.isMedium(asConfidence(0.95))).toBe(false); });
});

// ── isDatingPipelinePort type guard ───────────────────────────────────────────

describe('isDatingPipelinePort', () => {
  it('returns false for null', () => { expect(isDatingPipelinePort(null)).toBe(false); });
  it('returns false for undefined', () => { expect(isDatingPipelinePort(undefined)).toBe(false); });
  it('returns false for empty object', () => { expect(isDatingPipelinePort({})).toBe(false); });
  it('returns false when map missing', () => {
    expect(isDatingPipelinePort({ extract: () => {}, identifier: 'x' })).toBe(false);
  });
  it('returns false when extract missing', () => {
    expect(isDatingPipelinePort({ map: () => {}, identifier: 'x' })).toBe(false);
  });
  it('returns false when map not a function', () => {
    expect(isDatingPipelinePort({ map: 'not-fn', extract: () => {}, identifier: 'x' })).toBe(false);
  });
  it('returns false when identifier missing', () => {
    expect(isDatingPipelinePort({ map: () => {}, extract: () => {} })).toBe(false);
  });
  it('returns true for valid dating pipeline port shape', () => {
    expect(isDatingPipelinePort({ map: () => {}, extract: () => {}, identifier: 'test' })).toBe(true);
  });
});

// ── resolveCountryCode ────────────────────────────────────────────────────────

describe('resolveCountryCode', () => {
  it('resolves Spanish country name', () => {
    const code = resolveCountryCode('España');
    expect(code).toBe('ES');
  });

  it('resolves English country name', () => {
    const code = resolveCountryCode('Germany');
    expect(code).toBe('DE');
  });

  it('returns undefined for empty string', () => {
    expect(resolveCountryCode('')).toBeUndefined();
  });

  it('returns undefined for whitespace-only string', () => {
    expect(resolveCountryCode('   ')).toBeUndefined();
  });

  it('returns undefined for unknown name', () => {
    expect(resolveCountryCode('Narnia')).toBeUndefined();
  });
});
