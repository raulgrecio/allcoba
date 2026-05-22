/**
 * Integration test — DrizzleTaxonomyResolver against real PG via
 * testcontainers. Seeds catalog rows, verifies slug→id resolution and
 * cache hit behaviour.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { sql } from 'drizzle-orm';

import { DrizzleTaxonomyResolver } from '#infrastructure/adapters/catalog/drizzle-taxonomy-resolver.js';

import type { TestDb } from '../../../../helpers/test-db.js';
import {
  CREATE_CATALOG_SCHEMA,
  CREATE_CATALOG_TABLES,
  setupTestDb,
} from '../../../../helpers/test-db.js';

let env: TestDb;
let resolver: DrizzleTaxonomyResolver;

const COUNTRY_ES_ID = randomUUID();
const COUNTRY_VE_ID = randomUUID();
const CITY_MAD_ID = randomUUID();
const NATIONALITY_VE_ID = randomUUID();
const ETHNIC_LATIN_ID = randomUUID();
const HAIR_BROWN_ID = randomUUID();
const EYE_BROWN_ID = randomUUID();
const ORIENTATION_BI_ID = randomUUID();

beforeAll(async () => {
  env = await setupTestDb();

  await env.db.execute(CREATE_CATALOG_SCHEMA);
  await env.db.execute(CREATE_CATALOG_TABLES);

  await env.db.execute(
    sql`INSERT INTO catalog.countries (id, slug, iso2) VALUES
      (${COUNTRY_ES_ID}::uuid, 'spain', 'ES'),
      (${COUNTRY_VE_ID}::uuid, 'venezuela', 'VE')
    ON CONFLICT DO NOTHING`,
  );

  await env.db.execute(
    sql`INSERT INTO catalog.cities (id, slug, country_id)
      VALUES (${CITY_MAD_ID}::uuid, 'madrid', ${COUNTRY_ES_ID}::uuid)
    ON CONFLICT DO NOTHING`,
  );

  await env.db.execute(
    sql`INSERT INTO catalog.nationalities (id, slug, iso2_country)
      VALUES (${NATIONALITY_VE_ID}::uuid, 'venezuelan', 'VE')
    ON CONFLICT DO NOTHING`,
  );

  await env.db.execute(
    sql`INSERT INTO catalog.ethnics (id, slug)
      VALUES (${ETHNIC_LATIN_ID}::uuid, 'latin')
    ON CONFLICT DO NOTHING`,
  );

  await env.db.execute(
    sql`INSERT INTO catalog.hairs (id, slug)
      VALUES (${HAIR_BROWN_ID}::uuid, 'brown')
    ON CONFLICT DO NOTHING`,
  );

  await env.db.execute(
    sql`INSERT INTO catalog.eyes (id, slug)
      VALUES (${EYE_BROWN_ID}::uuid, 'brown')
    ON CONFLICT DO NOTHING`,
  );

  await env.db.execute(
    sql`INSERT INTO catalog.orientations (id, slug)
      VALUES (${ORIENTATION_BI_ID}::uuid, 'bi')
    ON CONFLICT DO NOTHING`,
  );

  resolver = new DrizzleTaxonomyResolver(env.db as never);
}, 60_000);

afterAll(async () => {
  await env.cleanup();
}, 60_000);

beforeEach(() => {
  resolver = new DrizzleTaxonomyResolver(env.db as never);
});

describe('DrizzleTaxonomyResolver', () => {
  it('resolveCountry — hit by iso2', async () => {
    const id = await resolver.resolveCountry('ES');
    expect(id).toBe(COUNTRY_ES_ID);
  });

  it('resolveCountry — case insensitive', async () => {
    expect(await resolver.resolveCountry('es')).toBe(COUNTRY_ES_ID);
  });

  it('resolveCountry — miss returns null', async () => {
    expect(await resolver.resolveCountry('XX')).toBeNull();
  });

  it('resolveCity — hit with countryIso2', async () => {
    const id = await resolver.resolveCity('madrid', 'ES');
    expect(id).toBe(CITY_MAD_ID);
  });

  it('resolveCity — hit without countryIso2 (slug-only fallback)', async () => {
    const id = await resolver.resolveCity('madrid');
    expect(id).toBe(CITY_MAD_ID);
  });

  it('resolveCity — miss returns null', async () => {
    expect(await resolver.resolveCity('unknown-city', 'ES')).toBeNull();
  });

  it('resolveNationality — hit', async () => {
    expect(await resolver.resolveNationality('venezuelan')).toBe(NATIONALITY_VE_ID);
  });

  it('resolveNationality — miss returns null', async () => {
    expect(await resolver.resolveNationality('martian')).toBeNull();
  });

  it('resolveEthnic — hit', async () => {
    expect(await resolver.resolveEthnic('latin')).toBe(ETHNIC_LATIN_ID);
  });

  it('resolveHair — hit', async () => {
    expect(await resolver.resolveHair('brown')).toBe(HAIR_BROWN_ID);
  });

  it('resolveEye — hit', async () => {
    expect(await resolver.resolveEye('brown')).toBe(EYE_BROWN_ID);
  });

  it('resolveOrientation — hit', async () => {
    expect(await resolver.resolveOrientation('bi')).toBe(ORIENTATION_BI_ID);
  });

  it('cache — second call skips DB query', async () => {
    const spy = vi.spyOn(env.db, 'select');
    await resolver.resolveNationality('venezuelan');
    const callsAfterFirst = spy.mock.calls.length;
    await resolver.resolveNationality('venezuelan');
    expect(spy.mock.calls.length).toBe(callsAfterFirst);
  });
});
