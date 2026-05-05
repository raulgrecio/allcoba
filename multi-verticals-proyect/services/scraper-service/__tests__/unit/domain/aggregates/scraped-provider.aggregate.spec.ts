import { ImageHash, Phone, Price, ProviderId, Telegram } from '@allcoba/domain';
import { describe, expect, it } from 'vitest';

import {
  ScrapedProvider,
  VerificationStatus,
  type ScrapedImage,
  type ScraperSignal,
} from '@scraper/domain/aggregates/scraped-provider.aggregate.js';
import { Vertical } from '@scraper/domain/entities/vertical.js';
import { ConfidenceScore } from '@scraper/domain/value-objects/confidence-score.vo.js';
import { ExternalId } from '@scraper/domain/value-objects/external-id.vo.js';
import { ScrapedAddress } from '@scraper/domain/value-objects/scraped-address.vo.js';

// --- VO factories ---

function ph(raw: string): Phone {
  const r = Phone.create(raw, 'ES');
  if (!r.success) throw new Error(`Bad phone: ${raw}`);
  return r.value;
}

function tg(handle: string): Telegram {
  const r = Telegram.create(handle);
  if (!r.success) throw new Error(`Bad telegram: ${handle}`);
  return r.value;
}

function eid(source: string, id: string): ExternalId {
  const r = ExternalId.create(source, id);
  if (!r.success) throw new Error(`Bad externalId: ${source}:${id}`);
  return r.value;
}

function hash(hex: string): ImageHash {
  const r = ImageHash.create(hex);
  if (!r.success) throw new Error(`Bad hash: ${hex}`);
  return r.value;
}

function price(amount: number): Price {
  const r = Price.create(amount, 'EUR');
  if (!r.success) throw new Error(`Bad price: ${amount}`);
  return r.value;
}

function addr(text: string): ScrapedAddress {
  const r = ScrapedAddress.create(text);
  if (!r.success) throw new Error(`Bad address: ${text}`);
  return r.value;
}

function img(hex: string, storedUrl = 'http://cdn.com/img.jpg'): ScrapedImage {
  return { hash: hash(hex), storedUrl, originalUrl: 'http://source.com/img.jpg' };
}

function signal(type: ScraperSignal['type']): ScraperSignal {
  return { type, sourceKey: 'src:1', confidence: 0.9, metadata: {}, createdAt: new Date() };
}

function makeProvider(overrides: Partial<Parameters<typeof ScrapedProvider.create>[0]> = {}): ScrapedProvider {
  return ScrapedProvider.create({
    vertical: Vertical.REAL_ESTATE,
    confidenceScore: ConfidenceScore.medium(),
    ...overrides,
  });
}

// --- Tests ---

describe('ScrapedProvider', () => {
  describe('create', () => {
    it('generates id when not provided', () => {
      const p = makeProvider();
      expect(p.id).toBeInstanceOf(ProviderId);
      expect(p.id.value).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('uses provided id', () => {
      const id = ProviderId.generate();
      const p = makeProvider({ id });
      expect(p.id.value).toBe(id.value);
    });

    it('defaults to empty collections', () => {
      const p = makeProvider();
      expect(p.phones).toHaveLength(0);
      expect(p.images).toHaveLength(0);
      expect(p.externalIds).toHaveLength(0);
      expect(p.signals).toHaveLength(0);
    });

    it('defaults verificationStatus to PENDING_REVIEW', () => {
      const p = makeProvider();
      expect(p.verificationStatus).toBe(VerificationStatus.PENDING_REVIEW);
    });

    it('defaults attributes and metadata to empty objects', () => {
      const p = makeProvider();
      expect(p.attributes).toEqual({});
      expect(p.metadata).toEqual({});
    });

    it('stores provided values', () => {
      const p = makeProvider({
        displayName: 'Piso Sol',
        phones: [ph('+34919032747')],
        telegram: tg('pisolsol'),
        description: 'Precioso piso',
        price: price(500000),
        externalIds: [eid('fotocasa', 'fc123')],
        images: [img('abcdef0123456789')],
        attributes: { rooms: 3 },
        metadata: { source: 'test' },
      });

      expect(p.displayName).toBe('Piso Sol');
      expect(p.phones).toHaveLength(1);
      expect(p.telegram?.handle).toBe('pisolsol');
      expect(p.description).toBe('Precioso piso');
      expect(p.price?.amount).toBe(500000);
      expect(p.externalIds).toHaveLength(1);
      expect(p.images).toHaveLength(1);
      expect(p.attributes).toEqual({ rooms: 3 });
      expect(p.metadata).toEqual({ source: 'test' });
    });
  });

  describe('hasPhone', () => {
    it('returns true for matching phone (e164 equality)', () => {
      const p = makeProvider({ phones: [ph('+34919032747')] });
      expect(p.hasPhone(ph('+34919032747'))).toBe(true);
    });

    it('returns true regardless of input format (VO normalizes)', () => {
      const p = makeProvider({ phones: [ph('+34919032747')] });
      // Both normalize to same e164 via libphonenumber
      expect(p.hasPhone(ph('919 032 747'))).toBe(true);
    });

    it('returns false for different phone', () => {
      const p = makeProvider({ phones: [ph('+34919032747')] });
      expect(p.hasPhone(ph('+34611222333'))).toBe(false);
    });

    it('returns false when no phones', () => {
      const p = makeProvider();
      expect(p.hasPhone(ph('+34919032747'))).toBe(false);
    });
  });

  describe('hasTelegram', () => {
    it('returns true for matching handle (case-insensitive)', () => {
      const p = makeProvider({ telegram: tg('PisoSol') });
      expect(p.hasTelegram(tg('pisosol'))).toBe(true);
    });

    it('returns false for different handle', () => {
      const p = makeProvider({ telegram: tg('PisoSol') });
      expect(p.hasTelegram(tg('otrocasa'))).toBe(false);
    });

    it('returns false when no telegram', () => {
      const p = makeProvider();
      expect(p.hasTelegram(tg('someone'))).toBe(false);
    });
  });

  describe('hasExternalId', () => {
    it('returns true for matching source:id pair', () => {
      const p = makeProvider({ externalIds: [eid('fotocasa', 'fc123')] });
      expect(p.hasExternalId(eid('fotocasa', 'fc123'))).toBe(true);
    });

    it('returns false for same id but different source', () => {
      const p = makeProvider({ externalIds: [eid('fotocasa', 'fc123')] });
      expect(p.hasExternalId(eid('idealista', 'fc123'))).toBe(false);
    });

    it('returns false when no externalIds', () => {
      const p = makeProvider();
      expect(p.hasExternalId(eid('fotocasa', 'fc123'))).toBe(false);
    });
  });

  describe('hasImageHash', () => {
    it('returns true for matching pHash', () => {
      const p = makeProvider({ images: [img('abcdef0123456789')] });
      expect(p.hasImageHash(hash('abcdef0123456789'))).toBe(true);
    });

    it('normalizes uppercase hex before comparing', () => {
      const p = makeProvider({ images: [img('abcdef0123456789')] });
      // ImageHash.create normalizes to lowercase — both become same value
      expect(p.hasImageHash(hash('ABCDEF0123456789'))).toBe(true);
    });

    it('returns false for different hash', () => {
      const p = makeProvider({ images: [img('abcdef0123456789')] });
      expect(p.hasImageHash(hash('1111111111111111'))).toBe(false);
    });
  });

  describe('findExternalIdBySource', () => {
    it('returns matching ExternalId', () => {
      const p = makeProvider({
        externalIds: [eid('fotocasa', 'fc123'), eid('idealista', 'id456')],
      });
      const found = p.findExternalIdBySource('idealista');
      expect(found?.id).toBe('id456');
    });

    it('returns undefined when source not present', () => {
      const p = makeProvider({ externalIds: [eid('fotocasa', 'fc123')] });
      expect(p.findExternalIdBySource('wallapop')).toBeUndefined();
    });
  });

  describe('merge — immutability', () => {
    it('returns new instance, never mutates original', () => {
      const original = makeProvider({ phones: [ph('+34919032747')] });
      const merged = original.merge({ phones: [ph('+34611222333')] });

      expect(merged).not.toBe(original);
      expect(original.phones).toHaveLength(1); // unchanged
    });

    it('preserves id across merge', () => {
      const original = makeProvider();
      const merged = original.merge({ description: 'new description' });
      expect(merged.id.value).toBe(original.id.value);
    });

    it('preserves vertical across merge', () => {
      const original = makeProvider({ vertical: Vertical.MOTOR });
      const merged = original.merge({ description: 'updated' });
      expect(merged.vertical).toBe(Vertical.MOTOR);
    });

    it('preserves createdAt, updates updatedAt and lastScrapedAt', () => {
      const created = new Date('2024-01-01');
      const original = makeProvider({ createdAt: created });
      const merged = original.merge({});
      expect(merged.createdAt).toBe(created);
      expect(merged.updatedAt.getTime()).toBeGreaterThan(created.getTime());
      expect(merged.lastScrapedAt.getTime()).toBeGreaterThan(created.getTime());
    });
  });

  describe('merge — existing values win', () => {
    it('existing displayName is never overwritten', () => {
      const original = makeProvider({ displayName: 'Original Name' });
      // MergeProps has no displayName field — display name is always preserved
      const merged = original.merge({ description: 'new desc' });
      expect(merged.displayName).toBe('Original Name');
    });

    it('existing telegram is kept when incoming has different value', () => {
      const original = makeProvider({ telegram: tg('original') });
      const merged = original.merge({ telegram: tg('incoming') });
      expect(merged.telegram?.handle).toBe('original');
    });

    it('incoming telegram is used when original has none', () => {
      const original = makeProvider();
      const merged = original.merge({ telegram: tg('incoming') });
      expect(merged.telegram?.handle).toBe('incoming');
    });

    it('existing address is kept when incoming provides one', () => {
      const original = makeProvider({ address: addr('Calle Alcalá 1') });
      const merged = original.merge({ address: addr('Gran Vía 10') });
      expect(merged.address?.text).toBe('Calle Alcalá 1');
    });

    it('incoming address is used when original has none', () => {
      const original = makeProvider();
      const merged = original.merge({ address: addr('Gran Vía 10') });
      expect(merged.address?.text).toBe('Gran Vía 10');
    });

    it('existing description is kept', () => {
      const original = makeProvider({ description: 'Original description' });
      const merged = original.merge({ description: 'New description' });
      expect(merged.description).toBe('Original description');
    });

    it('incoming description fills gap when original has none', () => {
      const original = makeProvider();
      const merged = original.merge({ description: 'From scraper' });
      expect(merged.description).toBe('From scraper');
    });
  });

  describe('merge — price exception (market data always wins)', () => {
    it('incoming price replaces existing price', () => {
      const original = makeProvider({ price: price(400000) });
      const merged = original.merge({ price: price(450000) });
      expect(merged.price?.amount).toBe(450000);
    });

    it('incoming price sets price when original has none', () => {
      const original = makeProvider();
      const merged = original.merge({ price: price(300000) });
      expect(merged.price?.amount).toBe(300000);
    });

    it('price stays unchanged when merge provides none', () => {
      const original = makeProvider({ price: price(500000) });
      const merged = original.merge({ description: 'new' });
      expect(merged.price?.amount).toBe(500000);
    });
  });

  describe('merge — phones deduplication', () => {
    it('adds new phones without duplicates', () => {
      const original = makeProvider({ phones: [ph('+34919032747')] });
      const merged = original.merge({ phones: [ph('+34919032747'), ph('+34611222333')] });
      expect(merged.phones).toHaveLength(2);
    });

    it('does not add phone already present', () => {
      const original = makeProvider({ phones: [ph('+34919032747')] });
      const merged = original.merge({ phones: [ph('+34919032747')] });
      expect(merged.phones).toHaveLength(1);
    });

    it('keeps existing phones when merge provides none', () => {
      const original = makeProvider({ phones: [ph('+34919032747')] });
      const merged = original.merge({ description: 'update' });
      expect(merged.phones).toHaveLength(1);
    });
  });

  describe('merge — images deduplication by hash', () => {
    it('adds new images', () => {
      const original = makeProvider({ images: [img('aaaaaaaaaaaaaaaa')] });
      const merged = original.merge({ images: [img('bbbbbbbbbbbbbbbb')] });
      expect(merged.images).toHaveLength(2);
    });

    it('does not add image with duplicate hash', () => {
      const original = makeProvider({ images: [img('aaaaaaaaaaaaaaaa')] });
      const merged = original.merge({ images: [img('aaaaaaaaaaaaaaaa', 'http://other.com/img.jpg')] });
      expect(merged.images).toHaveLength(1);
    });

    it('deduplicates across multiple incoming images', () => {
      const original = makeProvider({ images: [img('aaaaaaaaaaaaaaaa')] });
      const merged = original.merge({
        images: [
          img('aaaaaaaaaaaaaaaa'), // duplicate
          img('bbbbbbbbbbbbbbbb'), // new
          img('cccccccccccccccc'), // new
        ],
      });
      expect(merged.images).toHaveLength(3);
    });
  });

  describe('merge — externalIds deduplication', () => {
    it('adds new externalId from different source', () => {
      const original = makeProvider({ externalIds: [eid('fotocasa', 'fc1')] });
      const merged = original.merge({ externalIds: [eid('idealista', 'id1')] });
      expect(merged.externalIds).toHaveLength(2);
    });

    it('does not add duplicate externalId', () => {
      const original = makeProvider({ externalIds: [eid('fotocasa', 'fc1')] });
      const merged = original.merge({ externalIds: [eid('fotocasa', 'fc1')] });
      expect(merged.externalIds).toHaveLength(1);
    });
  });

  describe('merge — signals always appended', () => {
    it('appends incoming signals to existing signals', () => {
      const original = makeProvider({ signals: [signal('PHONE_MATCH')] });
      const merged = original.merge({ signals: [signal('TELEGRAM_MATCH')] });
      expect(merged.signals).toHaveLength(2);
      expect(merged.signals[0]!.type).toBe('PHONE_MATCH');
      expect(merged.signals[1]!.type).toBe('TELEGRAM_MATCH');
    });

    it('keeps existing signals when merge provides none', () => {
      const original = makeProvider({ signals: [signal('PHONE_MATCH')] });
      const merged = original.merge({ description: 'update' });
      expect(merged.signals).toHaveLength(1);
    });
  });

  describe('merge — attributes and metadata spread-merge', () => {
    it('merges attributes: incoming fields overwrite existing', () => {
      const original = makeProvider({ attributes: { rooms: 3, floor: 2 } });
      const merged = original.merge({ attributes: { rooms: 4, garage: true } });
      expect(merged.attributes).toEqual({ rooms: 4, floor: 2, garage: true });
    });

    it('adds lastMergedAt to metadata on every merge', () => {
      const original = makeProvider({ metadata: { source: 'test' } });
      const merged = original.merge({});
      expect(merged.metadata).toHaveProperty('lastMergedAt');
      expect(merged.metadata['source']).toBe('test');
    });

    it('incoming metadata fields overwrite existing', () => {
      const original = makeProvider({ metadata: { version: 1 } });
      const merged = original.merge({ metadata: { version: 2 } });
      expect(merged.metadata['version']).toBe(2);
    });
  });

  describe('merge — verificationStatus and confidenceScore', () => {
    it('updates verificationStatus when provided', () => {
      const original = makeProvider({ verificationStatus: VerificationStatus.PENDING_REVIEW });
      const merged = original.merge({ verificationStatus: VerificationStatus.AUTOMATIC_MATCH });
      expect(merged.verificationStatus).toBe(VerificationStatus.AUTOMATIC_MATCH);
    });

    it('keeps existing verificationStatus when not in merge', () => {
      const original = makeProvider({ verificationStatus: VerificationStatus.VERIFIED_MANUAL });
      const merged = original.merge({ description: 'update' });
      expect(merged.verificationStatus).toBe(VerificationStatus.VERIFIED_MANUAL);
    });

    it('updates confidenceScore when provided', () => {
      const original = makeProvider({ confidenceScore: ConfidenceScore.low() });
      const merged = original.merge({ confidenceScore: ConfidenceScore.high() });
      expect(merged.confidenceScore.value).toBe(ConfidenceScore.high().value);
    });
  });
});
