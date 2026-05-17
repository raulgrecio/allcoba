import { describe, expect, it } from 'vitest';

import {
  EUROGIRLSESCORT_SOURCE,
  mapEuroGirlsEscort,
} from '#infrastructure/adapters/sources/dating/eurogirlsescort/eurogirlsescort.mapper.js';
import type { EuroGirlsEscortPayload } from '#infrastructure/adapters/sources/dating/eurogirlsescort/eurogirlsescort.types.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const NOW = new Date('2026-05-17T12:00:00.000Z');
const resolver = new FakeTaxonomyResolver();

/** Minimal valid payload — represents Sofia from the real fixture. */
const sofiaPayload: EuroGirlsEscortPayload = {
  sourceId: '1053224',
  sourceUrl: 'https://www.eurogirlsescort.com/escort/sofia/1053224/',
  nickname: 'Sofia',
  bio: 'Hi guys my name is Sofia I am real russian hot top escort girl.',
  lastLoginDate: '28.4.2026',
  verified: true,
  badges: [
    { type: 'independent', label: 'Independent' },
    { type: 'video', label: 'Video' },
  ],
  params: {
    gender: 'Female',
    age: '30',
    locationCityName: 'Kuala Lumpur',
    locationCitySlug: 'kuala-lumpur',
    locationCountryName: 'Malaysia',
    locationCountrySlug: 'malaysia',
    cityPart: 'Bukit Bintang',
    cityPartSlug: 'bukit-bintang',
    eyes: 'Blue',
    hairColor: 'Blonde',
    hairLength: 'Medium long',
    pubicHair: 'Trimmed',
    bustSize: 'C',
    bustType: 'Natural',
    travel: 'No',
    weight: '55 kg / 121 lbs',
    height: "162 cm / 5'4''",
    ethnicity: 'Caucasian (white)',
    orientation: 'Bisexual',
    smoker: 'No',
    tattoo: 'No',
    piercing: 'No',
    nationality: 'Russian',
    languages: ['English'],
    servicesText: 'Best GFE in KL',
    availableFor: 'Outcall + Incall',
    meetingWith: 'Man',
  },
  phones: [
    {
      href: 'tel:+60173850646',
      number: '+60173850646',
      dataId: '1053224',
      dataPhone: 'Al-|DQb|I_-|lXl',
      hasWhatsapp: true,
      flagCountryCode: 'my',
    },
  ],
  photos: [
    { href: 'https://media541.eurogirlsescort.com/photo1.jpg', title: 'Sofia' },
    { href: 'https://media538.eurogirlsescort.com/photo2.jpg', title: 'Sofia' },
    { href: 'https://media533.eurogirlsescort.com/photo3.jpg', title: 'Sofia' },
  ],
  mapData: { lat: 3.1506, lng: 101.6945, zoom: 16 },
  workingTime: { nonstop: true },
  rates: [
    { duration: '0.5 Hour', incallAmount: 600, incallCurrency: 'MYR', incallEurAmount: 130, outcallAmount: 1000, outcallCurrency: 'MYR', outcallEurAmount: 216 },
    { duration: '1 Hour', incallAmount: 1000, incallCurrency: 'MYR', incallEurAmount: 216, outcallAmount: 1200, outcallCurrency: 'MYR', outcallEurAmount: 260 },
    { duration: '24 Hours', incallAmount: 8000, incallCurrency: 'MYR', incallEurAmount: 1730, outcallAmount: 8000, outcallCurrency: 'MYR', outcallEurAmount: 1730 },
  ],
  services: [
    { name: '69 position', included: true, extra: false },
    { name: 'Anal', included: true, extra: false },
    { name: 'GFE', included: true, extra: false },
  ],
  reviews: [],
};

// ============================================================================
// Golden-path — Sofia
// ============================================================================
describe('mapEuroGirlsEscort — Sofia golden path', () => {
  it('produces id with source prefix', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.id).toBe(`${EUROGIRLSESCORT_SOURCE}:1053224`);
  });

  it('sets vertical = dating, category = escorts', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('maps nickname', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.nickname).toBe('Sofia');
  });

  it('sets verified badge and verificationStatus', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.badges.verified).toBe(true);
    expect(sp.verificationStatus).toBe('verified');
  });

  it('sets video badge from payload.badges', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.statistics?.videoCount).toBe(1);
  });

  it('maps personalDetails.ageYears', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.personalDetails.ageYears).toBe(30);
  });

  it('maps personalDetails.gender → female', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.personalDetails.gender).toBe('female');
  });

  it('maps personalDetails.heightCm', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.personalDetails.heightCm).toBe(162);
  });

  it('maps personalDetails.weightKg', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.personalDetails.weightKg).toBe(55);
  });

  it('resolves nationalityId via slugify("Russian")', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.personalDetails.nationalityId).toBe('nationality:russian');
  });

  it('resolves ethnicId via slugify("Caucasian (white)")', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.personalDetails.ethnicId).toBe('ethnic:caucasian-white');
  });

  it('resolves hairId via slugify("Blonde")', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.personalDetails.hairId).toBe('hair:blonde');
  });

  it('resolves eyesId via slugify("Blue")', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.personalDetails.eyesId).toBe('eye:blue');
  });

  it('resolves orientationId via slugify("Bisexual")', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.personalDetails.orientationId).toBe('orientation:bisexual');
  });

  it('maps meetingWith from "Man" → ["man"]', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.personalDetails.meetingWith).toEqual(['man']);
  });

  it('maps baseCity from city slug', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.baseCity?.cityId).toContain('kuala-lumpur');
  });

  it('maps meetingPlaces incall + outcall', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.meetingPlaces.incall).toBe(true);
    expect(sp.meetingPlaces.outcall).toBe(true);
  });

  it('maps contactOptions with calls + whatsapp', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.contactOptions).toContain('calls');
    expect(sp.contactOptions).toContain('whatsapp');
  });

  it('maps phoneNumber from first phone', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.phoneNumber).toBe('+60173850646');
  });

  it('maps encodedPhoneNumber (obfuscated)', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.encodedPhoneNumber).toBe('Al-|DQb|I_-|lXl');
  });

  it('maps 3 photos', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.photos).toHaveLength(3);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    expect(sp.photos[1]!.isPrimary).toBe(false);
  });

  it('maps rates: 0.5 Hour incall → h0_5, 600 MYR', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    const rate = sp.prices.find((p) => p.slot === 'h0_5' && p.incall);
    expect(rate).toBeDefined();
    expect(rate!.amount).toBe(600);
    expect(rate!.currency).toBe('MYR');
  });

  it('maps rates: 1 Hour outcall → h1, 1200 MYR', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    const rate = sp.prices.find((p) => p.slot === 'h1' && p.outcall);
    expect(rate).toBeDefined();
    expect(rate!.amount).toBe(1200);
  });

  it('maps aboutMe from bio', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.aboutMe?.original).toContain('Sofia');
  });

  it('maps serviceText from servicesText', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.serviceText?.original).toBe('Best GFE in KL');
  });

  it('maps lastActiveAt from lastLoginDate', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.lastActiveAt).toBe('2026-04-28T00:00:00.000Z');
  });

  it('sets externalRefs', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.externalRefs).toHaveLength(1);
    expect(sp.externalRefs[0]!.source).toBe(EUROGIRLSESCORT_SOURCE);
    expect(sp.externalRefs[0]!.sourceId).toBe('1053224');
  });

  it('sets reviewsCount = 0 (no reviews)', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, resolver, { now: NOW });
    expect(sp.reviewsCount).toBe(0);
    expect(sp.reviewsRating).toBe(0);
  });
});

// ============================================================================
// Taxonomy misses
// ============================================================================
describe('mapEuroGirlsEscort — taxonomy misses', () => {
  const missResolver = new FakeTaxonomyResolver({
    misses: {
      nationality: new Set(['russian']),
      ethnic: new Set(['caucasian-white']),
    },
  });

  it('nationality miss → nationalityId undefined', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, missResolver, { now: NOW });
    expect(sp.personalDetails.nationalityId).toBeUndefined();
  });

  it('ethnic miss → ethnicId undefined', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, missResolver, { now: NOW });
    expect(sp.personalDetails.ethnicId).toBeUndefined();
  });

  it('other fields still mapped correctly', async () => {
    const sp = await mapEuroGirlsEscort(sofiaPayload, missResolver, { now: NOW });
    expect(sp.personalDetails.hairId).toBe('hair:blonde');
    expect(sp.personalDetails.eyesId).toBe('eye:blue');
  });
});

// ============================================================================
// Edge cases
// ============================================================================
describe('mapEuroGirlsEscort — edge cases', () => {
  it('unverified profile → verificationStatus = pending_review', async () => {
    const payload: EuroGirlsEscortPayload = {
      ...sofiaPayload,
      verified: false,
      badges: [],
    };
    const sp = await mapEuroGirlsEscort(payload, resolver, { now: NOW });
    expect(sp.verificationStatus).toBe('pending_review');
    expect(sp.badges.verified).toBe(false);
  });

  it('no phones → phoneNumber undefined, contactOptions empty', async () => {
    const payload: EuroGirlsEscortPayload = { ...sofiaPayload, phones: [] };
    const sp = await mapEuroGirlsEscort(payload, resolver, { now: NOW });
    expect(sp.phoneNumber).toBeUndefined();
    expect(sp.contactOptions).toHaveLength(0);
  });

  it('incall-only available-for', async () => {
    const payload: EuroGirlsEscortPayload = {
      ...sofiaPayload,
      params: { ...sofiaPayload.params, availableFor: 'Incall' },
    };
    const sp = await mapEuroGirlsEscort(payload, resolver, { now: NOW });
    expect(sp.meetingPlaces.incall).toBe(true);
    expect(sp.meetingPlaces.outcall).toBe(false);
  });

  it('missing params → ageYears = 0', async () => {
    const payload: EuroGirlsEscortPayload = {
      ...sofiaPayload,
      params: {},
    };
    const sp = await mapEuroGirlsEscort(payload, resolver, { now: NOW });
    expect(sp.personalDetails.ageYears).toBe(0);
  });

  it('with reviews → reviewsCount + reviewsRating', async () => {
    const payload: EuroGirlsEscortPayload = {
      ...sofiaPayload,
      reviews: [
        { author: 'John', date: '1.1.2026', rating: 5, text: 'Great!', city: undefined },
        { author: 'Mike', date: '2.2.2026', rating: 3, text: 'OK', city: undefined },
      ],
    };
    const sp = await mapEuroGirlsEscort(payload, resolver, { now: NOW });
    expect(sp.reviewsCount).toBe(2);
    expect(sp.reviewsRating).toBe(4);
    expect(sp.reviews).toHaveLength(2);
    expect(sp.reviews[0]!.author).toBe('John');
  });
});
