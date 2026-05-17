import { describe, expect, it, vi } from 'vitest';

import { ImageHash, Phone, ProviderId, unwrap } from '@allcoba/legacy-domain';

import { ScrapedProvider } from '#domain/aggregates/scraped-provider.aggregate.js';
import { ContactPlatform } from '#domain/entities/contact-platform.js';
import { VerificationStatus } from '#domain/entities/verification-status.js';
import { Vertical } from '#domain/entities/vertical.js';
import { ConfidenceScore } from '#domain/value-objects/confidence-score.vo.js';
import { ExternalId } from '#domain/value-objects/external-id.vo.js';
import { DrizzleProviderRepository } from '#infrastructure/adapters/persistence/drizzle-provider.repository.js';
import * as schema from '#infrastructure/adapters/persistence/schema/scraper.schema.js';

describe('DrizzleProviderRepository', () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
    // Para que el await query funcione si no se llama a .execute()
    then: vi.fn().mockImplementation((onFulfilled) => Promise.resolve([]).then(onFulfilled)),
  } as any;

  const repository = new DrizzleProviderRepository(mockDb);

  describe('toPersistence', () => {
    it('correctly maps a ScrapedProvider to a persistence row including images and signals', () => {
      const provider = ScrapedProvider.create({
        id: ProviderId.generate(),
        vertical: Vertical.REAL_ESTATE,
        phones: [],
        contacts: [{ platform: ContactPlatform.TELEGRAM, handle: 'testhandle' }],
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
      expect(row.contacts[0].platform).toBe(ContactPlatform.TELEGRAM);
      expect(row.contacts[0].handle).toBe('testhandle');
      expect(row.images[0].storedUrl).toBe('s1');
      expect(row.signals[0].type).toBe('IMAGE_MATCH');
      expect(row.attributes).toEqual({ rooms: 3 });
      expect(typeof row.confidenceScore).toBe('number');
    });
  });

  describe('toDomain', () => {
    it('correctly maps a database row to a ScrapedProvider including contacts and signals', () => {
      const row = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        displayName: 'Test Provider',
        phones: ['+34600000000'],
        contacts: [{ platform: ContactPlatform.TELEGRAM, handle: 'test_tg' }],
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
      expect(provider.contacts[0].platform).toBe(ContactPlatform.TELEGRAM);
      expect(provider.contacts[0].handle).toBe('test_tg');
      expect(provider.images[0].hash.toJSON()).toBe('0123456789abcdef');
      expect(provider.signals[0].type).toBe('IMAGE_MATCH');
    });
  });

  describe('Repository Methods', () => {
    it('findById searches all vertical tables', async () => {
      const id = ProviderId.generate();
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();

      await repository.findById(id);

      expect(mockDb.from).toHaveBeenCalledTimes(6);
    });

    it('create uses the correct vertical table (MOTOR)', async () => {
      vi.clearAllMocks();
      const provider = ScrapedProvider.create({
        vertical: Vertical.MOTOR,
        confidenceScore: ConfidenceScore.medium(),
      });

      await repository.create(provider);

      expect(mockDb.insert).toHaveBeenCalledWith(schema.motorProviders);
    });

    it('create uses the correct vertical table (REAL_ESTATE)', async () => {
      vi.clearAllMocks();
      const provider = ScrapedProvider.create({
        vertical: Vertical.REAL_ESTATE,
        confidenceScore: ConfidenceScore.medium(),
      });

      await repository.create(provider);

      expect(mockDb.insert).toHaveBeenCalledWith(schema.realEstateProviders);
    });

    it('update uses the correct vertical table (JOBS)', async () => {
      vi.clearAllMocks();
      const id = ProviderId.generate();
      const provider = ScrapedProvider.create({
        id,
        vertical: Vertical.JOBS,
        confidenceScore: ConfidenceScore.medium(),
      });

      await repository.update(id, provider);

      expect(mockDb.update).toHaveBeenCalledWith(schema.jobsProviders);
    });

    it('find with vertical searches only that table', async () => {
      vi.clearAllMocks();
      mockDb.where.mockReturnThis();

      await repository.find({
        vertical: Vertical.SERVICES,
        phone: unwrap(Phone.create('+34600000000', 'ES')),
      });

      expect(mockDb.from).toHaveBeenCalledTimes(1);
      expect(mockDb.from).toHaveBeenCalledWith(schema.servicesProviders);
    });

    it('find without vertical throws (vertical required for isolation)', async () => {
      // @ts-ignore
      await expect(repository.find({ phone: unwrap(Phone.create('+34600000000', 'ES')) })).rejects.toThrow(
        'vertical is required',
      );
    });

    it('find with contact criteria builds correct filter', async () => {
      vi.clearAllMocks();
      mockDb.where.mockReturnThis();

      await repository.find({
        vertical: Vertical.MOTOR,
        contact: { platform: ContactPlatform.TELEGRAM, handle: 'testhandle' },
        externalId: unwrap(ExternalId.create('source', 'id')),
        imageHash: unwrap(ImageHash.create('0123456789abcdef')),
      });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('find with only vertical returns all rows from that vertical', async () => {
      vi.clearAllMocks();
      mockDb.execute.mockResolvedValue([]);
      const results = await repository.find({ vertical: Vertical.GENERAL });
      expect(results).toEqual([]);
      expect(mockDb.from).toHaveBeenCalledWith(schema.generalProviders);
    });

    it('throws if vertical has no mapped table', async () => {
      const provider = ScrapedProvider.create({
        vertical: 'NON_EXISTENT' as any,
        confidenceScore: ConfidenceScore.low(),
      });

      await expect(repository.create(provider)).rejects.toThrow(
        "No table defined for vertical 'NON_EXISTENT'",
      );
    });
  });

  describe('Edge Cases in Mapping', () => {
    it('toDomain handles null optional fields', () => {
      const row = {
        id: ProviderId.generate().value,
        vertical: Vertical.GENERAL,
        phones: [],
        contacts: [],
        externalIds: [],
        images: [],
        signals: [],
        verificationStatus: VerificationStatus.PENDING_REVIEW,
        confidenceScore: 0.5,
        attributes: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        lastScrapedAt: new Date(),
        displayName: null,
        address: null,
        price: null,
      };

      const provider = (repository as any).toDomain(row);
      expect(provider.contacts).toHaveLength(0);
      expect(provider.location).toBeUndefined();
      expect(provider.price).toBeUndefined();
    });

    it('toDomain returns null if id is invalid', () => {
      const row = { id: 'invalid-uuid' } as any;
      const provider = (repository as any).toDomain(row);
      expect(provider).toBeNull();
    });
  });
});
