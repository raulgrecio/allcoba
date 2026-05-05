import fs from 'fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Email, Phone, ProviderId } from '@allcoba/domain';

import { ScrapedProvider } from '#domain/aggregates/scraped-provider.aggregate.js';
import { Vertical } from '#domain/entities/vertical.js';
import { ConfidenceScore } from '#domain/value-objects/confidence-score.vo.js';
import { ExternalId } from '#domain/value-objects/external-id.vo.js';
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

function makeJsonRecord(id = TEST_UUID, overrides: Record<string, unknown> = {}) {
  return {
    id,
    displayName: 'JSON Provider',
    phones: [],
    contacts: [],
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
    ...overrides,
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

  it('deserializes signals from JSON record', async () => {
    const record = makeJsonRecord(TEST_UUID, {
      signals: [
        {
          type: 'PHONE_MATCH',
          sourceKey: 'src:123',
          confidence: 0.9,
          metadata: { phones: ['+34600000000'] },
          createdAt: new Date('2024-01-01').toISOString(),
        },
      ],
    });
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([record]));

    const found = await repository.findById(makeProviderId());

    expect(found?.signals).toHaveLength(1);
    expect(found?.signals[0]!.type).toBe('PHONE_MATCH');
    expect(found?.signals[0]!.createdAt).toBeInstanceOf(Date);
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

  it('find() matches by email', async () => {
    const record = makeJsonRecord(TEST_UUID, { email: 'test@example.com' });
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([record]));

    const emailResult = Email.create('test@example.com');
    if (!emailResult.success) throw new Error('Invalid email in test');

    const results = await repository.find({ email: emailResult.value });
    expect(results).toHaveLength(1);
    expect(results[0]!.email?.value).toBe('test@example.com');
  });

  it('find() matches by contact', async () => {
    const record = makeJsonRecord(TEST_UUID, {
      contacts: [{ platform: 'TELEGRAM', handle: 'myhandle' }],
    });
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([record]));

    const results = await repository.find({
      contact: { platform: 'TELEGRAM', handle: 'myhandle' },
    });
    expect(results).toHaveLength(1);
  });

  it('find() matches by externalId', async () => {
    const record = makeJsonRecord(TEST_UUID, {
      externalIds: [{ source: 'idealista', id: 'abc123' }],
    });
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([record]));

    const externalIdResult = ExternalId.create('idealista', 'abc123');
    if (!externalIdResult.success) throw new Error('Invalid externalId in test');

    const results = await repository.find({
      externalId: externalIdResult.value,
      vertical: Vertical.REAL_ESTATE,
    });
    expect(results).toHaveLength(1);
  });

  it('find() matches by phone', async () => {
    const record = makeJsonRecord(TEST_UUID, { phones: ['+34600000000'] });
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([record]));

    const phoneResult = Phone.create('+34600000000', 'ES');
    if (!phoneResult.success) throw new Error('Invalid phone in test');

    const results = await repository.find({ phone: phoneResult.value });
    expect(results).toHaveLength(1);
  });
});
