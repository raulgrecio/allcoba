import { beforeEach, describe, expect, it } from 'vitest';

import { ImageHash, Phone, Price, ProviderId, Telegram } from '@allcoba/domain';
import { ScrapedProvider } from '@scraper/domain/aggregates/scraped-provider.aggregate.js';
import { Vertical } from '@scraper/domain/entities/vertical.js';
import { ConfidenceScore } from '@scraper/domain/value-objects/confidence-score.vo.js';
import { ExternalId } from '@scraper/domain/value-objects/external-id.vo.js';
import { InMemoryProviderRepository } from '@scraper/infrastructure/adapters/persistence/in-memory-provider.repository.js';

// --- Helpers ---

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

function pid(uuid: string): ProviderId {
  const r = ProviderId.create(uuid);
  if (!r.success) throw new Error(`Bad uuid: ${uuid}`);
  return r.value;
}

function makeProvider(): ScrapedProvider {
  return ScrapedProvider.create({
    id: pid('00000000-0000-4000-8000-000000000001'),
    displayName: 'Test Provider',
    vertical: Vertical.REAL_ESTATE,
    confidenceScore: ConfidenceScore.high(),
    phones: [ph('+34600000000')],
    telegram: tg('testhandle'),
    externalIds: [eid('fotocasa', 'fc123')],
    images: [
      {
        storedUrl: 'img1.jpg',
        originalUrl: 'http://img1.jpg',
        hash: hash('abcdef0123456789'),
      },
    ],
  });
}

// --- Tests ---

describe('Unit: InMemoryProviderRepository', () => {
  let repository: InMemoryProviderRepository;

  beforeEach(() => {
    repository = new InMemoryProviderRepository();
  });

  it('create and findById return same aggregate', async () => {
    const provider = makeProvider();
    await repository.create(provider);

    const found = await repository.findById(provider.id);

    expect(found).not.toBeNull();
    expect(found?.id.value).toBe(provider.id.value);
    expect(found?.displayName).toBe('Test Provider');
  });

  it('findById returns null for unknown id', async () => {
    const found = await repository.findById(pid('00000000-0000-4000-8000-000000000099'));
    expect(found).toBeNull();
  });

  it('find by phone returns matching provider', async () => {
    await repository.create(makeProvider());

    const results = await repository.find({ phone: ph('+34600000000') });

    expect(results).toHaveLength(1);
    expect(results[0]!.hasPhone(ph('+34600000000'))).toBe(true);
  });

  it('find by telegram returns matching provider', async () => {
    await repository.create(makeProvider());

    const results = await repository.find({ telegram: tg('testhandle') });

    expect(results).toHaveLength(1);
  });

  it('find by externalId returns matching provider', async () => {
    await repository.create(makeProvider());

    const results = await repository.find({ externalId: eid('fotocasa', 'fc123') });

    expect(results).toHaveLength(1);
    expect(results[0]!.findExternalIdBySource('fotocasa')?.id).toBe('fc123');
  });

  it('find by imageHash returns matching provider', async () => {
    await repository.create(makeProvider());

    const results = await repository.find({ imageHash: hash('abcdef0123456789') });

    expect(results).toHaveLength(1);
  });

  it('find returns empty when no criteria match', async () => {
    await repository.create(makeProvider());

    const results = await repository.find({ phone: ph('+34666999888') });

    expect(results).toHaveLength(0);
  });

  it('update replaces the aggregate', async () => {
    const original = makeProvider();
    await repository.create(original);

    const priceResult = Price.create(2000, 'EUR');
    if (!priceResult.success) throw new Error('Bad price');

    const updated = original.merge({ price: priceResult.value });
    await repository.update(original.id, updated);

    const found = await repository.findById(original.id);
    expect(found?.price?.amount).toBe(2000);
  });
});
