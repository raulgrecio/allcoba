import { describe, expect, it } from 'vitest';
import { mapNuevoloquo, NUEVOLOQUO_SOURCE } from '#infrastructure/adapters/sources/dating/nuevoloquo/nuevoloquo.mapper.js';
import type { NuevoloquoPayload } from '#infrastructure/adapters/sources/dating/nuevoloquo/nuevoloquo.types.js';
import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const SOURCE_URL = 'https://nuevoloquo.es/escort/madrid/ana-martinez/67890/';

const BASE_PAYLOAD: NuevoloquoPayload = {
  sourceId: '67890',
  sourceUrl: SOURCE_URL,
  title: 'Ana Martínez',
  nickname: 'Ana',
  bio: 'Hola, soy Ana.',
  params: {
    age: '27',
    gender: 'Mujer',
    ethnicity: 'Latina',
    hairColor: 'Morena',
    weightKg: '55',
    heightCm: '165',
    measurements: '90-60-90',
    serviceType: 'Hombre',
    languages: ['Español', 'Inglés'],
    locationCity: 'Madrid',
  },
  photos: [
    { src: 'https://cdn.nuevoloquo.es/fotos/ana1.jpg' },
    { src: 'https://cdn.nuevoloquo.es/fotos/ana2.jpg' },
  ],
  isVerified: true,
  hasVideo: false,
};

describe('mapNuevoloquo — identity', () => {
  it('providerId prefixed with source', async () => {
    const sp = await mapNuevoloquo(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.id).toBe(`${NUEVOLOQUO_SOURCE}:67890`);
  });

  it('vertical = dating, category = escorts', async () => {
    const sp = await mapNuevoloquo(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('nickname from payload', async () => {
    const sp = await mapNuevoloquo(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.nickname).toBe('Ana');
  });

  it('externalRef source = nuevoloquo', async () => {
    const sp = await mapNuevoloquo(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.externalRefs[0]?.source).toBe(NUEVOLOQUO_SOURCE);
    expect(sp.externalRefs[0]?.sourceId).toBe('67890');
  });
});

describe('mapNuevoloquo — verified badge', () => {
  it('verified payload → verificationStatus = verified', async () => {
    const sp = await mapNuevoloquo(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.verificationStatus).toBe('verified');
    expect(sp.badges.verified).toBe(true);
  });

  it('unverified payload → verificationStatus = pending_review', async () => {
    const sp = await mapNuevoloquo(
      { ...BASE_PAYLOAD, isVerified: false },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.verificationStatus).toBe('pending_review');
    expect(sp.badges.verified).toBe(false);
  });
});

describe('mapNuevoloquo — personalDetails', () => {
  it('ageYears = 27', async () => {
    const sp = await mapNuevoloquo(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.personalDetails.ageYears).toBe(27);
  });

  it('heightCm = 165', async () => {
    const sp = await mapNuevoloquo(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.personalDetails.heightCm).toBe(165);
  });

  it('weightKg = 55', async () => {
    const sp = await mapNuevoloquo(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.personalDetails.weightKg).toBe(55);
  });

  it('ethnicId resolved', async () => {
    const sp = await mapNuevoloquo(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.personalDetails.ethnicId).toContain('latina');
  });

  it('hairId resolved', async () => {
    const sp = await mapNuevoloquo(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.personalDetails.hairId).toContain('morena');
  });
});

describe('mapNuevoloquo — city', () => {
  it('resolves city → baseCity.id contains "madrid"', async () => {
    const sp = await mapNuevoloquo(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.baseCity?.id).toContain('madrid');
  });

  it('no city → baseCity undefined', async () => {
    const sp = await mapNuevoloquo(
      { ...BASE_PAYLOAD, params: { ...BASE_PAYLOAD.params, locationCity: undefined } },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.baseCity).toBeUndefined();
  });
});

describe('mapNuevoloquo — phone', () => {
  it('phoneNumber always undefined (requires Playwright)', async () => {
    const sp = await mapNuevoloquo(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.phoneNumber).toBeUndefined();
    expect(sp.contactOptions).toEqual([]);
  });
});

describe('mapNuevoloquo — photos and statistics', () => {
  it('maps 2 photos', async () => {
    const sp = await mapNuevoloquo(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    expect(sp.photos[1]!.isPrimary).toBe(false);
    expect(sp.statistics!.photoCount).toBe(2);
  });

  it('hasVideo → videoCount = 1', async () => {
    const sp = await mapNuevoloquo(
      { ...BASE_PAYLOAD, hasVideo: true },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.statistics!.videoCount).toBe(1);
  });
});

describe('mapNuevoloquo — aboutMe', () => {
  it('maps bio to aboutMe.original', async () => {
    const sp = await mapNuevoloquo(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.aboutMe?.original).toBe('Hola, soy Ana.');
  });

  it('no bio → aboutMe undefined', async () => {
    const sp = await mapNuevoloquo(
      { ...BASE_PAYLOAD, bio: undefined },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.aboutMe).toBeUndefined();
  });
});

describe('mapNuevoloquo — attributes', () => {
  it('stores measurements and serviceType in attributes', async () => {
    const sp = await mapNuevoloquo(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.attributes['measurements']).toBe('90-60-90');
    expect(sp.attributes['serviceType']).toBe('Hombre');
    expect(sp.attributes['languages']).toEqual(['Español', 'Inglés']);
  });
});

describe('mapNuevoloquo — no taxonomy resolver hits', () => {
  it('leaves ids undefined when resolver returns null', async () => {
    const nullResolver: FakeTaxonomyResolver = {
      resolveCity: () => Promise.resolve(null),
      resolveCountry: () => Promise.resolve(null),
      resolveNationality: () => Promise.resolve(null),
      resolveEthnic: () => Promise.resolve(null),
      resolveHair: () => Promise.resolve(null),
      resolveEye: () => Promise.resolve(null),
      resolveOrientation: () => Promise.resolve(null),
    };
    const sp = await mapNuevoloquo(BASE_PAYLOAD, nullResolver, { now: NOW });
    expect(sp.baseCity).toBeUndefined();
    expect(sp.personalDetails.ethnicId).toBeUndefined();
    expect(sp.personalDetails.hairId).toBeUndefined();
  });
});
