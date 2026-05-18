import { describe, expect, it } from 'vitest';
import { mapEscortAdvisor, ESCORT_ADVISOR_SOURCE } from '#infrastructure/adapters/sources/dating/escort-advisor/escort-advisor.mapper.js';
import type { EscortAdvisorPayload } from '#infrastructure/adapters/sources/dating/escort-advisor/escort-advisor.types.js';
import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const NOW = new Date('2026-01-01T00:00:00.000Z');
const SOURCE_URL = 'https://www.escort-advisor.xxx/escorts/spain/madrid/diana-667554247/';

const BASE_PAYLOAD: EscortAdvisorPayload = {
  sourceId: '667554247',
  sourceUrl: SOURCE_URL,
  title: 'Diana',
  nickname: 'Diana',
  bio: 'Hola, soy Diana, escort independiente en Madrid.',
  phone: '655447788',
  params: {
    age: 29,
    heightCm: 170,
    weightKg: 57,
    nationality: 'Venezolana',
    ethnicity: 'Latina',
    services: ['GFE', 'Masaje tántrico'],
  },
  photos: [
    { src: 'https://cdn.escort-advisor.xxx/fotos/diana_1.jpg' },
    { src: 'https://cdn.escort-advisor.xxx/fotos/diana_2.jpg' },
  ],
  isVerified: true,
};

describe('mapEscortAdvisor — identity', () => {
  it('providerId prefixed with source', async () => {
    const sp = await mapEscortAdvisor(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.id).toBe(`${ESCORT_ADVISOR_SOURCE}:667554247`);
  });

  it('vertical = dating, category = escorts', async () => {
    const sp = await mapEscortAdvisor(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('externalRef source = escort-advisor', async () => {
    const sp = await mapEscortAdvisor(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.externalRefs[0]?.source).toBe(ESCORT_ADVISOR_SOURCE);
    expect(sp.externalRefs[0]?.sourceId).toBe('667554247');
  });
});

describe('mapEscortAdvisor — phone', () => {
  it('maps phone', async () => {
    const sp = await mapEscortAdvisor(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.phoneNumber).toBe('655447788');
    expect(sp.contactOptions).toContain('calls');
  });

  it('no phone → undefined', async () => {
    const sp = await mapEscortAdvisor(
      { ...BASE_PAYLOAD, phone: undefined },
      new FakeTaxonomyResolver(),
      { now: NOW },
    );
    expect(sp.phoneNumber).toBeUndefined();
    expect(sp.contactOptions).toEqual([]);
  });
});

describe('mapEscortAdvisor — photos + verified', () => {
  it('maps 2 photos', async () => {
    const sp = await mapEscortAdvisor(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]!.isPrimary).toBe(true);
  });

  it('isVerified sets badge', async () => {
    const sp = await mapEscortAdvisor(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.badges.verified).toBe(true);
  });
});

describe('mapEscortAdvisor — personalDetails', () => {
  it('age + nationality + ethnicity resolved', async () => {
    const sp = await mapEscortAdvisor(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.personalDetails.ageYears).toBe(29);
    expect(sp.personalDetails.nationalityId).toBe('nationality:venezolana');
    expect(sp.personalDetails.ethnicId).toBe('ethnic:latina');
  });
});

describe('mapEscortAdvisor — geo', () => {
  it('baseCity always undefined (breadcrumb not extracted)', async () => {
    const sp = await mapEscortAdvisor(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.baseCity).toBeUndefined();
  });
});

describe('mapEscortAdvisor — ScraperMeta', () => {
  it('confidence = low (CF WAF site)', async () => {
    const sp = await mapEscortAdvisor(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.confidence).toBe(0.5);
  });

  it('timestamps set to now', async () => {
    const sp = await mapEscortAdvisor(BASE_PAYLOAD, new FakeTaxonomyResolver(), { now: NOW });
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
