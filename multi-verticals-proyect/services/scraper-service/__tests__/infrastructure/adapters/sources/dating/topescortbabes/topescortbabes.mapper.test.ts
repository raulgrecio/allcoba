import { describe, expect, it } from 'vitest';

import {
  TOPESCORTBABES_SOURCE,
  mapTopEscortBabes,
} from '#infrastructure/adapters/sources/dating/topescortbabes/topescortbabes.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadAllFixtures, loadFixture } from './helpers/load-fixtures.js';

const NOW = new Date('2026-05-17T12:00:00.000Z');
const resolver = new FakeTaxonomyResolver();

describe('mapTopEscortBabes — Chanel_1178 (golden path)', () => {
  it('maps every documented field', async () => {
    const { payload } = loadFixture('topescortbabes_Chanel_1178.json');
    const sp = await mapTopEscortBabes(payload, resolver, { now: NOW });

    expect(sp.id).toBe('topescortbabes:1178');
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
    expect(sp.nickname).toBe('Chanel');
    expect(sp.active).toBe(true);
    expect(sp.humanVerified).toBe(false);
    expect(sp.badges).toEqual({
      verified: true,
      trans: false,
      vip: false,
      pornstar: false,
    });
    expect(sp.verificationStatus).toBe('verified');
    expect(sp.agencyId).toBeUndefined();

    expect(sp.meetingPlaces).toEqual({ incall: true, outcall: true });
    expect(sp.contactOptions).toEqual(['calls', 'sms', 'whatsapp']);
  });

  it('builds geo refs through the resolver', async () => {
    const { payload } = loadFixture('topescortbabes_Chanel_1178.json');
    const sp = await mapTopEscortBabes(payload, resolver, { now: NOW });
    expect(sp.baseCity?.slug).toBe('madrid');
    expect(sp.baseCity?.lat).toBeCloseTo(40.4167);
    expect(sp.baseCity?.lng).toBeCloseTo(-3.7167);
    expect(sp.currentCity?.slug).toBe('madrid');
  });

  it('maps personalDetails using Schema.org first', async () => {
    const { payload } = loadFixture('topescortbabes_Chanel_1178.json');
    const sp = await mapTopEscortBabes(payload, resolver, { now: NOW });
    const pd = sp.personalDetails;
    expect(pd.ageYears).toBe(35);
    expect(pd.gender).toBe('female');
    expect(pd.heightCm).toBe(165);
    expect(pd.weightKg).toBe(54);
    expect(pd.bustCm).toBe(110);
    expect(pd.hipCm).toBe(99);
    expect(pd.waistCm).toBe(62);
    expect(pd.nationalityId).toBe('nationality:venezuelan');
    expect(pd.ethnicId).toBe('ethnic:latina');
    expect(pd.hairId).toBe('hair:brunette');
    expect(pd.eyesId).toBe('eye:brown');
    expect(pd.orientationId).toBe('orientation:bisexual');
    expect(pd.spokenLanguageCodes).toEqual(['EN', 'ES']);
    expect(pd.meetingWith.sort()).toEqual(['couple', 'man']);
    expect(pd.drink?.original).toBe('vodka');
    expect(pd.music?.original).toBe('HOUSE');
    expect(pd.hobby?.original).toBe('deportes');
  });

  it('maps prices and aboutMe', async () => {
    const { payload } = loadFixture('topescortbabes_Chanel_1178.json');
    const sp = await mapTopEscortBabes(payload, resolver, { now: NOW });
    expect(sp.prices).toHaveLength(1);
    expect(sp.prices[0]).toEqual({ slot: 'h1', amount: 220, currency: 'EUR' });
    expect(sp.aboutMe?.original).toContain('My name is Chanel');
  });

  it('maps photos with verification level', async () => {
    const { payload } = loadFixture('topescortbabes_Chanel_1178.json');
    const sp = await mapTopEscortBabes(payload, resolver, { now: NOW });
    expect(sp.photos.length).toBeGreaterThan(0);
    expect([1, 2, -1]).toContain(sp.photos[0]!.verificationLevel);
    expect(sp.photos[0]!.uploadedAt).toMatch(/T\d{2}:/);
  });

  it('maps mainMedia video', async () => {
    const { payload } = loadFixture('topescortbabes_Chanel_1178.json');
    const sp = await mapTopEscortBabes(payload, resolver, { now: NOW });
    expect(sp.mainMedia?.type).toBe('video');
    expect(sp.mainMedia?.orientation).toBe('landscape');
    expect(sp.mainMedia?.width).toBe(1280);
    expect(sp.mainMedia?.height).toBe(720);
    expect(sp.mainMedia?.poster).toMatch(/^https?:/);
  });

  it('attaches ScraperMeta correctly', async () => {
    const { payload } = loadFixture('topescortbabes_Chanel_1178.json');
    const sp = await mapTopEscortBabes(payload, resolver, { now: NOW });
    expect(sp.externalRefs).toHaveLength(1);
    expect(sp.externalRefs[0]).toMatchObject({
      source: TOPESCORTBABES_SOURCE,
      sourceId: '1178',
    });
    expect(sp.confidence).toBeGreaterThan(0.9);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });

  it('parses updatedAt human date', async () => {
    const { payload } = loadFixture('topescortbabes_Chanel_1178.json');
    const sp = await mapTopEscortBabes(payload, resolver, { now: NOW });
    expect(sp.updatedAt).toBe('2025-09-01T00:00:00.000Z');
  });

  it('parses lastActive relative time', async () => {
    const { payload } = loadFixture('topescortbabes_Chanel_1178.json');
    const sp = await mapTopEscortBabes(payload, resolver, { now: NOW });
    expect(sp.lastActiveAt).toBe('2026-05-13T12:00:00.000Z');
  });
});

describe('mapTopEscortBabes — Eva_525467 (reviews present)', () => {
  it('maps reviews and reviewsOverall with subratings', async () => {
    const { payload } = loadFixture('topescortbabes_Eva_525467.json');
    const sp = await mapTopEscortBabes(payload, resolver, { now: NOW });

    expect(sp.reviewsCount).toBe(3);
    expect(sp.reviews).toHaveLength(3);
    expect(sp.reviewsOverall?.count).toBe(3);
    expect(sp.reviewsOverall?.tags.length).toBeGreaterThan(0);
    expect(sp.reviewsOverall?.tags[0]?.code).toMatch(/^[a-z0-9_]+$/);
    expect(sp.reviewsOverall?.averageRatings?.looks).toBe(10);
    expect(sp.reviewsOverall?.meetAgainPercentage).toBe(100);

    const review = sp.reviews[0]!;
    expect(review.authorNickname).toBeDefined();
    expect(review.ratings.place).toBe(10);
    expect(review.ratings.looks).toBe(10);
    expect(review.meetingPlace).toBe('incall');
    expect(review.aspects.contact?.original).toBeTruthy();
    expect(review.aspects.appearance?.original).toBeTruthy();
  });

  it('builds rating distributions', async () => {
    const { payload } = loadFixture('topescortbabes_Eva_525467.json');
    const sp = await mapTopEscortBabes(payload, resolver, { now: NOW });
    expect(sp.ratingDistributions?.overall?.averageRating).toBe(10);
    expect(sp.ratingDistributions?.punctuality).toBeNull();
  });
});

describe('mapTopEscortBabes — bulk invariants over 51 fixtures', () => {
  const fixtures = loadAllFixtures();

  it('loads exactly 51 fixtures', () => {
    expect(fixtures).toHaveLength(51);
  });

  it.each(fixtures.map((f) => [f.filename, f] as const))(
    'maps %s without throwing and satisfies invariants',
    async (_name, fixture) => {
      const sp = await mapTopEscortBabes(fixture.payload, resolver, { now: NOW });

      // identity
      expect(sp.id).toMatch(/^topescortbabes:\d+$/);
      expect(sp.vertical).toBe('dating');
      expect(sp.nickname.length).toBeGreaterThan(0);
      expect(sp.badges).toEqual({
        verified: expect.any(Boolean),
        trans: expect.any(Boolean),
        vip: expect.any(Boolean),
        pornstar: expect.any(Boolean),
      });

      // personalDetails always present
      expect(sp.personalDetails.ageYears).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(sp.personalDetails.spokenLanguageCodes)).toBe(true);
      expect(Array.isArray(sp.personalDetails.meetingWith)).toBe(true);

      // prices well-formed
      for (const p of sp.prices) {
        expect(p.amount).toBeGreaterThanOrEqual(0);
        expect(['EUR', 'GBP', 'AED']).toContain(p.currency);
      }

      // photos verification level in known set
      for (const photo of sp.photos) {
        expect([-1, 1, 2]).toContain(photo.verificationLevel);
      }

      // ScraperMeta
      expect(sp.externalRefs).toHaveLength(1);
      expect(sp.externalRefs[0]?.source).toBe(TOPESCORTBABES_SOURCE);
      expect(sp.lastScrapedAt).toBe(NOW.toISOString());
      expect(sp.confidence).toBeGreaterThanOrEqual(0);
      expect(sp.confidence).toBeLessThanOrEqual(1);
    },
  );
});

describe('mapTopEscortBabes — taxonomy misses degrade gracefully', () => {
  it('leaves ids undefined when resolver returns null', async () => {
    const { payload } = loadFixture('topescortbabes_Chanel_1178.json');
    const stubMiss = new FakeTaxonomyResolver({
      misses: {
        nationality: new Set(['venezuelan']),
        hair: new Set(['brunette']),
      },
    });
    const sp = await mapTopEscortBabes(payload, stubMiss, { now: NOW });
    expect(sp.personalDetails.nationalityId).toBeUndefined();
    expect(sp.personalDetails.hairId).toBeUndefined();
    expect(sp.personalDetails.ethnicId).toBe('ethnic:latina');
  });

  it('leaves baseCity undefined when city resolver misses', async () => {
    const { payload } = loadFixture('topescortbabes_Chanel_1178.json');
    const stubMiss = new FakeTaxonomyResolver({
      misses: { city: new Set(['madrid']) },
    });
    const sp = await mapTopEscortBabes(payload, stubMiss, { now: NOW });
    expect(sp.baseCity).toBeUndefined();
  });
});
