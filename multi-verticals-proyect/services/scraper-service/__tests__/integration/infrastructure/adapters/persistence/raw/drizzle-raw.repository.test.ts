import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { RawPayloadRecord } from '#application/ports/raw-payload.port.js';
import { DrizzleRawPayloadRepository } from '#infrastructure/adapters/persistence/raw/drizzle-raw.repository.js';

import type { TestDb } from '../../../../../helpers/test-db.js';
import { setupTestDb, truncateAll } from '../../../../../helpers/test-db.js';

const SOURCE = 'topescortbabes';

let env: TestDb;
let repo: DrizzleRawPayloadRepository;

beforeAll(async () => {
  env = await setupTestDb();
  repo = new DrizzleRawPayloadRepository(env.db);
}, 60_000);

afterAll(async () => {
  await env.cleanup();
}, 60_000);

beforeEach(async () => {
  await truncateAll(env.db);
});

const sample = (id: string, payload: unknown = { hello: 'world' }): RawPayloadRecord => ({
  source: SOURCE,
  sourceId: id,
  sourceUrl: `https://example.com/${id}`,
  payload,
  capturedAt: new Date('2026-05-17T12:00:00.000Z').toISOString(),
});

describe('DrizzleRawPayloadRepository', () => {
  it('save + findOne roundtrips a record', async () => {
    await repo.save(sample('1178', { id: 1178, nickname: 'Chanel' }));
    const got = await repo.findOne(SOURCE, '1178');
    expect(got).not.toBeNull();
    expect(got?.sourceId).toBe('1178');
    expect((got?.payload as { nickname: string }).nickname).toBe('Chanel');
    expect(got?.sourceUrl).toBe('https://example.com/1178');
  });

  it('findOne returns null for unknown ids', async () => {
    expect(await repo.findOne(SOURCE, 'missing')).toBeNull();
  });

  it('save overwrites on (source, sourceId) conflict', async () => {
    await repo.save(sample('1178', { v: 1 }));
    await repo.save(sample('1178', { v: 2 }));
    const got = await repo.findOne(SOURCE, '1178');
    expect((got?.payload as { v: number }).v).toBe(2);
  });

  it('find with criteria returns matching records', async () => {
    await repo.save(sample('1'));
    await repo.save(sample('2'));
    await repo.save({ ...sample('3'), source: 'other' });

    const all = await repo.find({ source: SOURCE });
    expect(all).toHaveLength(2);

    const one = await repo.find({ source: SOURCE, sourceId: '1' });
    expect(one).toHaveLength(1);
    expect(one[0]?.sourceId).toBe('1');
  });

  it('list yields all records of a source via async iterator', async () => {
    for (const id of ['a', 'b', 'c']) await repo.save(sample(id));
    const out: string[] = [];
    for await (const r of repo.list(SOURCE)) out.push(r.sourceId);
    expect(out.sort()).toEqual(['a', 'b', 'c']);
  });
});
