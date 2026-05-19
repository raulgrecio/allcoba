import { describe, expect, it } from 'vitest';

import { OverwritePersistenceStrategy } from '#application/strategies/overwrite-persistence.strategy.js';
import { InMemoryScrapedEntityRepository } from '#infrastructure/adapters/persistence/in-memory-scraped-entity.repository.js';
import type { ScrapedListing } from '#domain/canonical/scraped-listing.js';
import { asConfidence } from '#domain/canonical/confidence.js';

import { asProviderId } from '@allcoba/shared-types';
import { randomUUID } from 'node:crypto';

const CTX = { source: 'wallapop', url: 'https://wallapop.com/item/1' };

const makeListing = (sourceId: string, overrides: Partial<ScrapedListing> = {}): ScrapedListing => ({
  id: asProviderId(randomUUID()),
  vertical: 'general',
  title: 'Test item',
  categoryPath: ['Electronics'],
  photos: [],
  externalRefs: [{ source: 'wallapop', sourceId }],
  confidence: asConfidence(0.8),
  attributes: {},
  metadata: {},
  lastScrapedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('OverwritePersistenceStrategy', () => {
  it('CREATE on first persist', async () => {
    const repo = new InMemoryScrapedEntityRepository<ScrapedListing>();
    const strategy = new OverwritePersistenceStrategy(repo);

    const result = await strategy.persist(makeListing('item-1'), CTX);

    expect(result.action).toBe('CREATE');
    const stored = await repo.findByExternalRef({ source: 'wallapop', sourceId: 'item-1' });
    expect(stored?.title).toBe('Test item');
  });

  it('UPDATE when externalRef already exists', async () => {
    const repo = new InMemoryScrapedEntityRepository<ScrapedListing>();
    const strategy = new OverwritePersistenceStrategy(repo);

    await strategy.persist(makeListing('item-2'), CTX);
    const updated = makeListing('item-2', { title: 'Updated item' });
    const result = await strategy.persist(updated, CTX);

    expect(result.action).toBe('UPDATE');
    const stored = await repo.findByExternalRef({ source: 'wallapop', sourceId: 'item-2' });
    expect(stored?.title).toBe('Updated item');
  });

  it('IGNORE when no externalRefs', async () => {
    const repo = new InMemoryScrapedEntityRepository<ScrapedListing>();
    const strategy = new OverwritePersistenceStrategy(repo);

    const noRef = makeListing('x', { externalRefs: [] });
    const result = await strategy.persist(noRef, CTX);

    expect(result.action).toBe('IGNORE');
  });
});
