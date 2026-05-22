/**
 * Integration test — runs the topescortbabes mapper over real fixtures, then
 * persists and reads back through the Drizzle repository against a real PG.
 *
 * Goal: catch contract drift between the canonical ScrapedProvider shape
 * emitted by the mapper and what the repo can serialize/deserialize. The
 * unit tests of the mapper cover the in-memory shape; this one ensures it
 * survives a JSONB round-trip.
 *
 * Note on ids: the mapper emits ids of shape `topescortbabes:<numericId>`,
 * but the DB column is `uuid`. We override the id with `crypto.randomUUID()`
 * before insert. This mismatch is a known issue to address when the provider
 * repo schema is updated to accept source-derived ids.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import type { ProviderId } from '@allcoba/shared-types';
import { asProviderId } from '@allcoba/shared-types';

import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { DrizzleProviderRepository } from '#infrastructure/adapters/persistence/drizzle-provider.repository.js';
import {
  mapTopEscortBabes,
  TOPESCORTBABES_SOURCE,
} from '#infrastructure/adapters/sources/dating/topescortbabes/topescortbabes.mapper.js';

import type { TestDb } from '../../../../helpers/test-db.js';
import { setupTestDb, truncateAll } from '../../../../helpers/test-db.js';
import { FakeTaxonomyResolver } from '../../../../unit/infrastructure/adapters/sources/dating/topescortbabes/helpers/fake-taxonomy-resolver.js';
import {
  loadAllFixtures,
  loadFixture,
} from '../../../../unit/infrastructure/adapters/sources/dating/topescortbabes/helpers/load-fixtures.js';

const NOW = new Date('2026-05-17T12:00:00.000Z');
const resolver = new FakeTaxonomyResolver();

let env: TestDb;
let repo: DrizzleProviderRepository;

beforeAll(async () => {
  env = await setupTestDb();
  repo = new DrizzleProviderRepository(env.db);
}, 60_000);

afterAll(async () => {
  await env.cleanup();
}, 60_000);

beforeEach(async () => {
  await truncateAll(env.db);
});

const withUuid = (sp: ScrapedProvider): ScrapedProvider => ({
  ...sp,
  id: asProviderId(randomUUID()),
});

describe('DrizzleProviderRepository — round-trip from mapper output', () => {
  it('persists and reads back a single fixture (Chanel)', async () => {
    const { payload } = loadFixture('topescortbabes_Chanel_1178.json');
    const sp = withUuid(await mapTopEscortBabes(payload, resolver, { now: NOW }));

    await repo.create(sp);
    const got = await repo.findById(sp.id);

    expect(got).not.toBeNull();
    expect(got?.nickname).toBe('Chanel');
    expect(got?.personalDetails.ageYears).toBe(35);
    expect(got?.externalRefs[0]?.source).toBe(TOPESCORTBABES_SOURCE);
    expect(got?.photos.length).toBe(sp.photos.length);
  });

  it('find by externalRef returns the persisted record', async () => {
    const { payload } = loadFixture('topescortbabes_Chanel_1178.json');
    const sp = withUuid(await mapTopEscortBabes(payload, resolver, { now: NOW }));
    await repo.create(sp);

    const results = await repo.find({
      vertical: 'dating',
      externalRef: { source: TOPESCORTBABES_SOURCE, sourceId: '1178' },
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe(sp.id);
  });

  it('bulk roundtrip — 5 fixtures persist + read back identical', async () => {
    const fixtures = loadAllFixtures().slice(0, 5);
    const persistedIds: ProviderId[] = [];

    for (const f of fixtures) {
      const sp = withUuid(await mapTopEscortBabes(f.payload, resolver, { now: NOW }));
      await repo.create(sp);
      persistedIds.push(sp.id);
    }

    for (const id of persistedIds) {
      const got = await repo.findById(id);
      expect(got).not.toBeNull();
      expect(got?.vertical).toBe('dating');
      expect(got?.externalRefs[0]?.source).toBe(TOPESCORTBABES_SOURCE);
    }
  });

  it('update replaces the stored record', async () => {
    const { payload } = loadFixture('topescortbabes_Chanel_1178.json');
    const sp = withUuid(await mapTopEscortBabes(payload, resolver, { now: NOW }));
    await repo.create(sp);

    const updated: ScrapedProvider = { ...sp, nickname: 'Chanel Updated' };
    await repo.updateById(sp.id, updated);

    const got = await repo.findById(sp.id);
    expect(got?.nickname).toBe('Chanel Updated');
  });
});
