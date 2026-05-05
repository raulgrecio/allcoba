import { describe, expect, it, vi } from 'vitest';

import { ImageHash, Phone, ProviderId, Telegram, unwrap } from '@allcoba/domain';

import {
  ScrapedProvider,
  VerificationStatus,
} from '#domain/aggregates/scraped-provider.aggregate.js';
import { Vertical } from '#domain/entities/vertical.js';
import { ConfidenceScore } from '#domain/value-objects/confidence-score.vo.js';
import { ExternalId } from '#domain/value-objects/external-id.vo.js';
import { DrizzleProviderRepository } from '#infrastructure/adapters/persistence/drizzle-provider.repository.js';

describe('DrizzleProviderRepository', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  } as any;

  const repository = new DrizzleProviderRepository(mockDb);

  describe('toPersistence', () => {
    it('correctly maps a ScrapedProvider to a persistence row including images and signals', () => {
      const provider = ScrapedProvider.create({
        id: ProviderId.generate(),
        vertical: Vertical.REAL_ESTATE,
        phones: [],
        externalIds: [],
        verificationStatus: VerificationStatus.PENDING_REVIEW,
        confidenceScore: ConfidenceScore.high(),
        images: [
          {
            storedUrl: 's1',
            originalUrl: 'o1',
            hash: unwrap(ImageHash.create('0123456789abcdef')),
          },
        ],
        signals: [
          {
            type: 'IMAGE_MATCH',
            sourceKey: 's:1',
            confidence: 0.9,
            metadata: {},
            createdAt: new Date(),
          },
        ],
        attributes: { rooms: 3 },
        metadata: { foo: 'bar' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const row = (repository as any).toPersistence(provider);

      expect(row.id).toBe(provider.id.value);
      expect(row.images[0].storedUrl).toBe('s1');
      expect(row.signals[0].type).toBe('IMAGE_MATCH');
      expect(row.attributes).toEqual({ rooms: 3 });
    });
  });

  describe('toDomain', () => {
    it('correctly maps a database row to a ScrapedProvider including signals', () => {
      const row = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        displayName: 'Test Provider',
        phones: ['+34600000000'],
        telegram: 'test_tg',
        address: { text: 'Calle Falsa 123' },
        description: 'A test description',
        price: { amount: 1000, currency: 'EUR' },
        images: [{ storedUrl: 's1', originalUrl: 'o1', hash: '0123456789abcdef' }],
        vertical: Vertical.REAL_ESTATE,
        externalIds: [{ source: 'idealista', id: 'abc' }],
        verificationStatus: VerificationStatus.VERIFIED_MANUAL,
        confidenceScore: 0.9,
        signals: [
          {
            type: 'IMAGE_MATCH',
            sourceKey: 's:1',
            confidence: 0.9,
            metadata: {},
            createdAt: new Date().toISOString(),
          },
        ],
        attributes: { rooms: 2 },
        metadata: {},
        lastScrapedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const provider = (repository as any).toDomain(row);

      expect(provider).toBeInstanceOf(ScrapedProvider);
      expect(provider.id.value).toBe(row.id);
      expect(provider.images[0].hash.toJSON()).toBe('0123456789abcdef');
      expect(provider.signals[0].type).toBe('IMAGE_MATCH');
    });
  });

  describe('Repository Methods', () => {
    it('findById calls db with correct id', async () => {
      const id = ProviderId.generate();
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnValue([]); // Empty row for simplicity

      await repository.findById(id);

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('create calls insert with persistence row', async () => {
      const provider = ScrapedProvider.create({
        vertical: Vertical.GENERAL,
        confidenceScore: ConfidenceScore.medium(),
      });

      await repository.create(provider);

      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
    });

    it('update calls update with persistence row', async () => {
      const id = ProviderId.generate();
      const provider = ScrapedProvider.create({
        id,
        vertical: Vertical.GENERAL,
        confidenceScore: ConfidenceScore.medium(),
      });

      await repository.update(id, provider);

      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
    });

    it('find builds filters for all criteria', async () => {
      mockDb.where.mockReturnValue([]);

      const criteria = {
        vertical: Vertical.MOTOR,
        phone: unwrap(Phone.create('+34600000000', 'ES')),
        telegram: unwrap(Telegram.create('testhandle')),
        externalId: unwrap(ExternalId.create('source', 'id')),
        imageHash: unwrap(ImageHash.create('0123456789abcdef')),
      };

      await repository.find(criteria);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it('find returns empty array if no criteria provided', async () => {
      // Reset mocks to ensure they are not called
      vi.clearAllMocks();
      const results = await repository.find({});
      expect(results).toEqual([]);
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases in Mapping', () => {
    it('toDomain handles null optional fields', () => {
      const row = {
        id: ProviderId.generate().value,
        vertical: Vertical.GENERAL,
        phones: [],
        externalIds: [],
        images: [],
        signals: [],
        verificationStatus: VerificationStatus.PENDING_REVIEW,
        confidenceScore: 0.5,
        attributes: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        displayName: null,
        telegram: null,
        address: null,
        price: null,
      };

      const provider = (repository as any).toDomain(row);
      expect(provider.telegram).toBeUndefined();
      expect(provider.address).toBeUndefined();
      expect(provider.price).toBeUndefined();
    });

    it('toDomain returns null if id is invalid', () => {
      const row = { id: 'invalid-uuid' } as any;
      const provider = (repository as any).toDomain(row);
      expect(provider).toBeNull();
    });
  });
});
