/**
 * Pipeline test — end-to-end from real HTML capture to ScrapedProvider.
 *
 * This validates that the extractor + mapper agree on the same payload
 * shape. Pure unit tests of each stage live in their own files; this one
 * exists to catch contract drift between them.
 */

import { describe, expect, it } from 'vitest';

import { extractProfileDataFromHtml } from '#infrastructure/adapters/sources/dating/topescortbabes/topescortbabes.extractor.js';
import {
  TOPESCORTBABES_SOURCE,
  mapTopEscortBabes,
} from '#infrastructure/adapters/sources/dating/topescortbabes/topescortbabes.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { listHtmlFixtures, loadHtmlFixture } from './helpers/load-fixtures.js';

const NOW = new Date('2026-05-17T12:00:00.000Z');
const resolver = new FakeTaxonomyResolver();

describe('topescortbabes pipeline (HTML → ScrapedProvider)', () => {
  it.each(listHtmlFixtures())(
    'maps %s end-to-end and yields a valid ScrapedProvider',
    async (filename) => {
      const html = loadHtmlFixture(filename);
      const payload = extractProfileDataFromHtml(html);
      expect(payload).not.toBeNull();

      const sp = await mapTopEscortBabes(payload!, resolver, { now: NOW });

      expect(sp.id).toMatch(/^topescortbabes:\d+$/);
      expect(sp.vertical).toBe('dating');
      expect(sp.nickname.length).toBeGreaterThan(0);
      expect(sp.personalDetails.ageYears).toBeGreaterThan(0);
      expect(sp.externalRefs[0]?.source).toBe(TOPESCORTBABES_SOURCE);
      expect(sp.lastScrapedAt).toBe(NOW.toISOString());
    },
  );
});
