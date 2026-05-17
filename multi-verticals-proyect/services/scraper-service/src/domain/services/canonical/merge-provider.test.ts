import { describe, expect, it } from 'vitest';

import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';
import { mergeProvider } from './merge-provider.js';

// ── fixture factory ──────────────────────────────────────────────────────────

function makeProvider(overrides: Partial<ScrapedProvider> = {}): ScrapedProvider {
  return {
    id: 'provider-1' as ScrapedProvider['id'],
    vertical: 'dating',
    nickname: 'test-nick',
    active: true,
    humanVerified: false,
    badges: { verified: false, trans: false, vip: false, pornstar: false },
    verificationStatus: 'pending_review',
    meetingPlaces: { incall: false, outcall: false },
    contactOptions: [],
    personalDetails: { ageYears: 25, spokenLanguageCodes: [], meetingWith: [] },
    prices: [],
    photos: [],
    tours: [],
    links: {},
    otherPlatforms: [],
    reviewsEnabled: true,
    reviewsCount: 0,
    reviewsRating: 0,
    reviews: [],
    // ScraperMeta
    externalRefs: [],
    signals: [],
    confidence: 0.5 as ScrapedProvider['confidence'],
    images: [],
    attributes: {},
    metadata: {},
    lastScrapedAt: '2024-01-01T00:00:00.000Z',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeRef(source: string, sourceId: string): ExternalRef {
  return { source, sourceId };
}

// ── identity ────────────────────────────────────────────────────────────────

describe('mergeProvider — identity', () => {
  it('preserves existing id', () => {
    const existing = makeProvider({ id: 'id-existing' as ScrapedProvider['id'] });
    const result = mergeProvider(existing, { id: 'id-incoming' as ScrapedProvider['id'] });
    expect(result.id).toBe('id-existing');
  });

  it('preserves existing vertical', () => {
    const existing = makeProvider({ vertical: 'dating' });
    const result = mergeProvider(existing, { vertical: 'motor' });
    expect(result.vertical).toBe('dating');
  });

  it('preserves existing createdAt', () => {
    const existing = makeProvider({ createdAt: '2024-01-01T00:00:00.000Z' });
    const result = mergeProvider(existing, { createdAt: '2025-01-01T00:00:00.000Z' });
    expect(result.createdAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('updatedAt is refreshed (not from either input)', () => {
    const before = new Date().toISOString();
    const existing = makeProvider({ updatedAt: '2024-01-01T00:00:00.000Z' });
    const result = mergeProvider(existing, {});
    expect(result.updatedAt >= before).toBe(true);
  });
});

// ── existing wins ────────────────────────────────────────────────────────────

describe('mergeProvider — existing wins', () => {
  it('keeps existing nickname', () => {
    const existing = makeProvider({ nickname: 'original-nick' });
    const result = mergeProvider(existing, { nickname: 'new-nick' });
    expect(result.nickname).toBe('original-nick');
  });

  it('keeps existing phoneNumber when both present', () => {
    const existing = makeProvider({ phoneNumber: '+34600000001' as ScrapedProvider['phoneNumber'] });
    const result = mergeProvider(existing, { phoneNumber: '+34600000002' as ScrapedProvider['phoneNumber'] });
    expect(result.phoneNumber).toBe('+34600000001');
  });

  it('takes incoming phoneNumber when existing is undefined', () => {
    const existing = makeProvider({ phoneNumber: undefined });
    const result = mergeProvider(existing, { phoneNumber: '+34600000002' as ScrapedProvider['phoneNumber'] });
    expect(result.phoneNumber).toBe('+34600000002');
  });

  it('keeps existing email', () => {
    const existing = makeProvider({ email: 'orig@test.com' as ScrapedProvider['email'] });
    const result = mergeProvider(existing, { email: 'new@test.com' as ScrapedProvider['email'] });
    expect(result.email).toBe('orig@test.com');
  });

  it('keeps existing aboutMe when both present', () => {
    const existing = makeProvider({ aboutMe: { original: 'My original bio', language: 'es' } });
    const result = mergeProvider(existing, { aboutMe: { original: 'New bio', language: 'es' } });
    expect(result.aboutMe?.original).toBe('My original bio');
  });

  it('takes incoming aboutMe when existing is undefined', () => {
    const existing = makeProvider({ aboutMe: undefined });
    const result = mergeProvider(existing, { aboutMe: { original: 'New bio', language: 'es' } });
    expect(result.aboutMe?.original).toBe('New bio');
  });

  it('keeps existing baseCity', () => {
    const existing = makeProvider({ baseCity: { id: 'city-1' as ScrapedProvider['baseCity']['id'], name: 'Madrid', countryIso2: 'ES' as any } });
    const result = mergeProvider(existing, { baseCity: { id: 'city-2' as any, name: 'Barcelona', countryIso2: 'ES' as any } });
    expect(result.baseCity?.name).toBe('Madrid');
  });

  it('keeps existing humanVerified (not overridable by scraper)', () => {
    const existing = makeProvider({ humanVerified: true });
    const result = mergeProvider(existing, { humanVerified: false });
    expect(result.humanVerified).toBe(true);
  });

  it('keeps existing badges', () => {
    const existing = makeProvider({ badges: { verified: true, trans: false, vip: false, pornstar: false } });
    const result = mergeProvider(existing, { badges: { verified: false, trans: true, vip: false, pornstar: false } });
    expect(result.badges.verified).toBe(true);
    expect(result.badges.trans).toBe(false);
  });
});

// ── incoming wins ────────────────────────────────────────────────────────────

describe('mergeProvider — incoming wins', () => {
  it('takes incoming active flag', () => {
    const existing = makeProvider({ active: true });
    const result = mergeProvider(existing, { active: false });
    expect(result.active).toBe(false);
  });

  it('takes incoming verificationStatus', () => {
    const existing = makeProvider({ verificationStatus: 'pending_review' });
    const result = mergeProvider(existing, { verificationStatus: 'verified' });
    expect(result.verificationStatus).toBe('verified');
  });

  it('takes incoming currentCity', () => {
    const existing = makeProvider({ currentCity: { id: 'city-1' as any, name: 'Madrid', countryIso2: 'ES' as any } });
    const result = mergeProvider(existing, { currentCity: { id: 'city-2' as any, name: 'Barcelona', countryIso2: 'ES' as any } });
    expect(result.currentCity?.name).toBe('Barcelona');
  });

  it('takes incoming prices', () => {
    const existing = makeProvider({ prices: [{ slot: 'h1', amount: 100, currency: 'EUR' }] });
    const result = mergeProvider(existing, { prices: [{ slot: 'h1', amount: 200, currency: 'EUR' }] });
    expect(result.prices[0]?.amount).toBe(200);
  });

  it('takes incoming meetingPlaces', () => {
    const existing = makeProvider({ meetingPlaces: { incall: false, outcall: false } });
    const result = mergeProvider(existing, { meetingPlaces: { incall: true, outcall: true } });
    expect(result.meetingPlaces.incall).toBe(true);
  });

  it('takes incoming confidence', () => {
    const existing = makeProvider({ confidence: 0.5 as any });
    const result = mergeProvider(existing, { confidence: 0.9 as any });
    expect(result.confidence).toBe(0.9);
  });
});

// ── merge+dedup ──────────────────────────────────────────────────────────────

describe('mergeProvider — merge+dedup', () => {
  describe('externalRefs', () => {
    it('keeps existing refs', () => {
      const ref = makeRef('siteA', 'id-1');
      const existing = makeProvider({ externalRefs: [ref] });
      const result = mergeProvider(existing, { externalRefs: [] });
      expect(result.externalRefs).toHaveLength(1);
    });

    it('appends novel incoming refs', () => {
      const existing = makeProvider({ externalRefs: [makeRef('siteA', 'id-1')] });
      const result = mergeProvider(existing, { externalRefs: [makeRef('siteB', 'id-2')] });
      expect(result.externalRefs).toHaveLength(2);
    });

    it('deduplicates refs with same source+sourceId', () => {
      const ref = makeRef('siteA', 'id-1');
      const existing = makeProvider({ externalRefs: [ref] });
      const result = mergeProvider(existing, { externalRefs: [makeRef('siteA', 'id-1')] });
      expect(result.externalRefs).toHaveLength(1);
    });

    it('treats same source but different sourceId as distinct', () => {
      const existing = makeProvider({ externalRefs: [makeRef('siteA', 'id-1')] });
      const result = mergeProvider(existing, { externalRefs: [makeRef('siteA', 'id-2')] });
      expect(result.externalRefs).toHaveLength(2);
    });
  });

  describe('contactOptions', () => {
    it('unions contact options without duplicates', () => {
      const existing = makeProvider({ contactOptions: ['calls', 'whatsapp'] });
      const result = mergeProvider(existing, { contactOptions: ['whatsapp', 'telegram'] });
      expect(result.contactOptions).toHaveLength(3);
      expect(result.contactOptions).toContain('calls');
      expect(result.contactOptions).toContain('whatsapp');
      expect(result.contactOptions).toContain('telegram');
    });

    it('returns existing when incoming is empty', () => {
      const existing = makeProvider({ contactOptions: ['calls'] });
      const result = mergeProvider(existing, { contactOptions: [] });
      expect(result.contactOptions).toEqual(['calls']);
    });
  });

  describe('otherPlatforms', () => {
    it('appends novel platforms by url', () => {
      const existing = makeProvider({ otherPlatforms: [{ platform: 'instagram', url: 'https://ig.com/a' }] });
      const result = mergeProvider(existing, { otherPlatforms: [{ platform: 'twitter', url: 'https://x.com/a' }] });
      expect(result.otherPlatforms).toHaveLength(2);
    });

    it('deduplicates by url', () => {
      const existing = makeProvider({ otherPlatforms: [{ platform: 'instagram', url: 'https://ig.com/a' }] });
      const result = mergeProvider(existing, { otherPlatforms: [{ platform: 'instagram', url: 'https://ig.com/a' }] });
      expect(result.otherPlatforms).toHaveLength(1);
    });
  });

  describe('reviews', () => {
    it('appends novel reviews by id', () => {
      const existing = makeProvider({ reviews: [{ id: 'r1' as any, authorNickname: 'A', averageRating: 4, meetingPlace: 'incall', meetAgain: true, meetGood: true, ratings: {} as any }] });
      const result = mergeProvider(existing, { reviews: [{ id: 'r2' as any, authorNickname: 'B', averageRating: 5, meetingPlace: 'incall', meetAgain: true, meetGood: true, ratings: {} as any }] });
      expect(result.reviews).toHaveLength(2);
    });

    it('deduplicates reviews by id', () => {
      const review = { id: 'r1' as any, authorNickname: 'A', averageRating: 4, meetingPlace: 'incall' as const, meetAgain: true, meetGood: true, ratings: {} as any };
      const existing = makeProvider({ reviews: [review] });
      const result = mergeProvider(existing, { reviews: [review] });
      expect(result.reviews).toHaveLength(1);
    });
  });

  describe('images', () => {
    it('appends novel images by hash', () => {
      const existing = makeProvider({ images: [{ hash: 'hash1' as any, storedUrl: 'url1', originalUrl: 'orig1' }] });
      const result = mergeProvider(existing, { images: [{ hash: 'hash2' as any, storedUrl: 'url2', originalUrl: 'orig2' }] });
      expect(result.images).toHaveLength(2);
    });

    it('deduplicates images by hash', () => {
      const img = { hash: 'hash1' as any, storedUrl: 'url1', originalUrl: 'orig1' };
      const existing = makeProvider({ images: [img] });
      const result = mergeProvider(existing, { images: [{ ...img, storedUrl: 'url1-updated' }] });
      expect(result.images).toHaveLength(1);
      expect(result.images[0]?.storedUrl).toBe('url1');
    });
  });
});

// ── signals: always append ───────────────────────────────────────────────────

describe('mergeProvider — signals', () => {
  it('appends incoming signals to existing (never discards)', () => {
    const existing = makeProvider({ signals: [{ type: 'PHONE_MATCH', weight: 0.9, detectedAt: '2024-01-01T00:00:00.000Z' }] });
    const result = mergeProvider(existing, { signals: [{ type: 'EMAIL_MATCH', weight: 0.9, detectedAt: '2024-01-02T00:00:00.000Z' }] });
    expect(result.signals).toHaveLength(2);
  });

  it('keeps existing signals when incoming has none', () => {
    const existing = makeProvider({ signals: [{ type: 'PHONE_MATCH', weight: 0.9, detectedAt: '2024-01-01T00:00:00.000Z' }] });
    const result = mergeProvider(existing, {});
    expect(result.signals).toHaveLength(1);
  });
});

// ── attributes and metadata ───────────────────────────────────────────────────

describe('mergeProvider — attributes & metadata', () => {
  it('spreads attributes — incoming wins on conflict', () => {
    const existing = makeProvider({ attributes: { age: 25, source: 'siteA' } });
    const result = mergeProvider(existing, { attributes: { source: 'siteB', newField: true } });
    expect(result.attributes['source']).toBe('siteB');
    expect(result.attributes['age']).toBe(25);
    expect(result.attributes['newField']).toBe(true);
  });

  it('spreads metadata — incoming wins on conflict', () => {
    const existing = makeProvider({ metadata: { runId: 'run-1' } });
    const result = mergeProvider(existing, { metadata: { runId: 'run-2', extra: 'x' } });
    expect(result.metadata['runId']).toBe('run-2');
    expect(result.metadata['extra']).toBe('x');
  });

  it('sets metadata.lastMergedAt on every merge', () => {
    const before = new Date().toISOString();
    const existing = makeProvider({ metadata: {} });
    const result = mergeProvider(existing, {});
    expect(result.metadata['lastMergedAt'] as string >= before).toBe(true);
  });
});

// ── timestamps ───────────────────────────────────────────────────────────────

describe('mergeProvider — lastActiveAt', () => {
  it('picks the later ISO timestamp', () => {
    const existing = makeProvider({ lastActiveAt: '2024-06-01T00:00:00.000Z' });
    const result = mergeProvider(existing, { lastActiveAt: '2024-07-01T00:00:00.000Z' });
    expect(result.lastActiveAt).toBe('2024-07-01T00:00:00.000Z');
  });

  it('keeps existing when incoming is undefined', () => {
    const existing = makeProvider({ lastActiveAt: '2024-06-01T00:00:00.000Z' });
    const result = mergeProvider(existing, {});
    expect(result.lastActiveAt).toBe('2024-06-01T00:00:00.000Z');
  });

  it('returns undefined when both are undefined', () => {
    const existing = makeProvider({ lastActiveAt: undefined });
    const result = mergeProvider(existing, {});
    expect(result.lastActiveAt).toBeUndefined();
  });
});

// ── personalDetails ───────────────────────────────────────────────────────────

describe('mergeProvider — personalDetails', () => {
  it('takes incoming ageYears', () => {
    const existing = makeProvider({ personalDetails: { ageYears: 25, spokenLanguageCodes: [], meetingWith: [] } });
    const result = mergeProvider(existing, { personalDetails: { ageYears: 26, spokenLanguageCodes: [], meetingWith: [] } });
    expect(result.personalDetails.ageYears).toBe(26);
  });

  it('keeps existing heightCm when both present', () => {
    const existing = makeProvider({ personalDetails: { ageYears: 25, heightCm: 170, spokenLanguageCodes: [], meetingWith: [] } });
    const result = mergeProvider(existing, { personalDetails: { ageYears: 26, heightCm: 165, spokenLanguageCodes: [], meetingWith: [] } });
    expect(result.personalDetails.heightCm).toBe(170);
  });

  it('takes incoming heightCm when existing is undefined', () => {
    const existing = makeProvider({ personalDetails: { ageYears: 25, spokenLanguageCodes: [], meetingWith: [] } });
    const result = mergeProvider(existing, { personalDetails: { ageYears: 26, heightCm: 165, spokenLanguageCodes: [], meetingWith: [] } });
    expect(result.personalDetails.heightCm).toBe(165);
  });

  it('unions spokenLanguageCodes without duplicates', () => {
    const existing = makeProvider({ personalDetails: { ageYears: 25, spokenLanguageCodes: ['es' as any, 'en' as any], meetingWith: [] } });
    const result = mergeProvider(existing, { personalDetails: { ageYears: 25, spokenLanguageCodes: ['en' as any, 'fr' as any], meetingWith: [] } });
    expect(result.personalDetails.spokenLanguageCodes).toHaveLength(3);
    expect(result.personalDetails.spokenLanguageCodes).toContain('es');
    expect(result.personalDetails.spokenLanguageCodes).toContain('en');
    expect(result.personalDetails.spokenLanguageCodes).toContain('fr');
  });
});
