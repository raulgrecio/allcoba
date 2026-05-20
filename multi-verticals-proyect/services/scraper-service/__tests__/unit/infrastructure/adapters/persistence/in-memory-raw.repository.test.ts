import { describe, expect, it } from 'vitest';

import { InMemoryRawPayloadRepository } from '#infrastructure/adapters/persistence/raw/in-memory-raw.repository.js';
import type { RawPayloadRecord } from '#application/ports/raw-payload.port.js';

const makeRecord = (overrides: Partial<RawPayloadRecord> = {}): RawPayloadRecord => ({
  source: 'erosguia',
  sourceId: '12345',
  sourceUrl: 'https://erosguia.com/12345.html',
  payload: { nickname: 'Test' },
  capturedAt: new Date().toISOString(),
  ...overrides,
});

describe('InMemoryRawPayloadRepository', () => {
  it('save + findOne round-trips', async () => {
    const repo = new InMemoryRawPayloadRepository();
    const rec = makeRecord();
    await repo.save(rec);
    const found = await repo.findOne(rec.source, rec.sourceId);
    expect(found?.sourceId).toBe(rec.sourceId);
    expect(found?.payload).toEqual(rec.payload);
  });

  it('findOne returns null when not found', async () => {
    const repo = new InMemoryRawPayloadRepository();
    expect(await repo.findOne('unknown', 'missing')).toBeNull();
  });

  it('save overwrites existing record with same key', async () => {
    const repo = new InMemoryRawPayloadRepository();
    const rec = makeRecord({ payload: { nickname: 'Original' } });
    await repo.save(rec);
    await repo.save({ ...rec, payload: { nickname: 'Updated' } });
    const found = await repo.findOne(rec.source, rec.sourceId);
    expect((found?.payload as any).nickname).toBe('Updated');
  });

  it('find by source returns all matching records', async () => {
    const repo = new InMemoryRawPayloadRepository();
    await repo.save(makeRecord({ sourceId: 'a' }));
    await repo.save(makeRecord({ sourceId: 'b' }));
    await repo.save(makeRecord({ source: 'other', sourceId: 'c' }));
    const results = await repo.find({ source: 'erosguia' });
    expect(results).toHaveLength(2);
  });

  it('find with sourceId filters to exact match', async () => {
    const repo = new InMemoryRawPayloadRepository();
    await repo.save(makeRecord({ sourceId: 'a' }));
    await repo.save(makeRecord({ sourceId: 'b' }));
    const results = await repo.find({ source: 'erosguia', sourceId: 'a' });
    expect(results).toHaveLength(1);
    expect(results[0]!.sourceId).toBe('a');
  });

  it('find returns empty array when source not found', async () => {
    const repo = new InMemoryRawPayloadRepository();
    const results = await repo.find({ source: 'missing' });
    expect(results).toHaveLength(0);
  });

  it('list yields all records for source', async () => {
    const repo = new InMemoryRawPayloadRepository();
    await repo.save(makeRecord({ sourceId: 'x' }));
    await repo.save(makeRecord({ sourceId: 'y' }));
    await repo.save(makeRecord({ source: 'other', sourceId: 'z' }));
    const yielded: string[] = [];
    for await (const r of repo.list('erosguia')) {
      yielded.push(r.sourceId);
    }
    expect(yielded.sort()).toEqual(['x', 'y']);
  });

  it('list yields nothing for unknown source', async () => {
    const repo = new InMemoryRawPayloadRepository();
    const yielded: unknown[] = [];
    for await (const r of repo.list('nope')) {
      yielded.push(r);
    }
    expect(yielded).toHaveLength(0);
  });
});
