/**
 * Integration test — real HTML → extractor → mapper → ScrapedProvider.
 * Validates that the full pipeline produces a coherent ScrapedProvider
 * from the captured sofia_1053224.html fixture.
 */

import { describe, expect, it } from 'vitest';

import { extractEuroGirlsEscort } from '#infrastructure/adapters/sources/dating/eurogirlsescort/eurogirlsescort.extractor.js';
import {
  EUROGIRLSESCORT_SOURCE,
  mapEuroGirlsEscort,
} from '#infrastructure/adapters/sources/dating/eurogirlsescort/eurogirlsescort.mapper.js';
import type { EuroGirlsEscortPayload } from '#infrastructure/adapters/sources/dating/eurogirlsescort/eurogirlsescort.types.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtmlFixture } from './helpers/load-fixtures.js';

const NOW = new Date('2026-05-17T12:00:00.000Z');
const resolver = new FakeTaxonomyResolver();

describe('EuroGirlsEscort pipeline — sofia_1053224.html', () => {
  it('produces a valid ScrapedProvider', async () => {
    const html = loadHtmlFixture('sofia_1053224.html');
    const payload = extractEuroGirlsEscort(html) as EuroGirlsEscortPayload;
    const sp = await mapEuroGirlsEscort(payload, resolver, { now: NOW });

    expect(sp.vertical).toBe('dating');
    expect(sp.nickname).toBe('Sofia');
    expect(sp.personalDetails.ageYears).toBe(30);
    expect(sp.personalDetails.gender).toBe('female');
    expect(sp.personalDetails.heightCm).toBe(162);
    expect(sp.personalDetails.weightKg).toBe(55);
    expect(sp.personalDetails.nationalityId).toBeTruthy();
    expect(sp.badges.verified).toBe(true);
    expect(sp.photos.length).toBeGreaterThan(3);
    expect(sp.prices.length).toBeGreaterThan(5);
    // services stay in the raw payload — the mapper doesn't map them to Profile
    expect(payload.services.length).toBeGreaterThan(10);
    expect(sp.externalRefs[0]?.source).toBe(EUROGIRLSESCORT_SOURCE);
    expect(sp.externalRefs[0]?.sourceId).toBe('1053224');
  });

  it('round-trips extractor → mapper → externalRef consistency', async () => {
    const html = loadHtmlFixture('sofia_1053224.html');
    const payload = extractEuroGirlsEscort(html);
    const sp = await mapEuroGirlsEscort(payload, resolver, { now: NOW });

    // sourceUrl from canonical tag must survive into externalRef
    expect(sp.externalRefs[0]?.sourceUrl).toBe(
      'https://www.eurogirlsescort.com/escort/sofia/1053224/',
    );
    // phone from HTML must be in ScrapedProvider
    expect(sp.phoneNumber).toContain('+60');
    // lastActiveAt from lastLoginDate in HTML
    expect(sp.lastActiveAt).toBe('2026-04-28T00:00:00.000Z');
  });
});
