import fs from 'fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProviderId } from '@allcoba/domain';

import { ScrapedProvider } from '#domain/aggregates/scraped-provider.aggregate.js';
import { Vertical } from '#domain/entities/vertical.js';
import { ConfidenceScore } from '#domain/value-objects/confidence-score.vo.js';
import { JsonFileProviderRepository } from '#infrastructure/adapters/persistence/json-file-provider.repository.js';

vi.mock('fs/promises');

const TEST_UUID = '00000000-0000-4000-8000-000000000001';

function makeProviderId(): ProviderId {
  const r = ProviderId.create(TEST_UUID);
  if (!r.success) throw new Error('Invalid UUID in test');
  return r.value;
}

function makeProvider(): ScrapedProvider {
  return ScrapedProvider.create({
    id: makeProviderId(),
    displayName: 'JSON Provider',
    vertical: Vertical.REAL_ESTATE,
    confidenceScore: ConfidenceScore.low(),
  });
}

/** Returns a valid JsonRecord shape as stored on disk. */
function makeJsonRecord(id = TEST_UUID) {
  return {
    id,
    displayName: 'JSON Provider',
    phones: [],
    images: [],
    externalIds: [],
    vertical: 'REAL_ESTATE',
    verificationStatus: 'PENDING_REVIEW',
    confidenceScore: 0.5,
    signals: [],
    attributes: {},
    metadata: {},
    lastScrapedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe('Unit: JsonFileProviderRepository', () => {
  let repository: JsonFileProviderRepository;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    repository = new JsonFileProviderRepository({ fileName: 'test-providers.json' });
  });

  it('returns null when file read fails', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));

    const found = await repository.findById(makeProviderId());
    expect(found).toBeNull();
  });

  it('deserializes ScrapedProvider aggregate from JSON', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([makeJsonRecord()]));

    const found = await repository.findById(makeProviderId());

    expect(found).not.toBeNull();
    expect(found?.displayName).toBe('JSON Provider');
    expect(found?.vertical).toBe(Vertical.REAL_ESTATE);
    expect(found?.confidenceScore.value).toBe(0.5);
  });

  it('serializes ScrapedProvider aggregate to JSON on create', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('[]');
    vi.mocked(fs.writeFile).mockResolvedValue();

    const provider = makeProvider();
    await repository.create(provider);

    expect(fs.writeFile).toHaveBeenCalled();
    const [, content] = vi.mocked(fs.writeFile).mock.calls[0]!;
    const saved = JSON.parse(content as string);

    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe(TEST_UUID);
    expect(saved[0].displayName).toBe('JSON Provider');
    expect(saved[0].vertical).toBe('REAL_ESTATE');
    expect(saved[0].confidenceScore).toBe(0.5);
  });

  it('round-trips: create then findById returns same aggregate', async () => {
    // Simulate load() returning empty then the written content
    let stored = '[]';
    vi.mocked(fs.readFile).mockImplementation(async () => stored);
    vi.mocked(fs.writeFile).mockImplementation(async (_path, content) => {
      stored = content as string;
    });

    const provider = makeProvider();
    await repository.create(provider);

    const found = await repository.findById(makeProviderId());
    expect(found).not.toBeNull();
    expect(found?.id.value).toBe(TEST_UUID);
    expect(found?.displayName).toBe('JSON Provider');
  });
});
