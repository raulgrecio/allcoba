import { describe, expect, it } from 'vitest';

import { mapDestacamos } from '#infrastructure/adapters/sources/dating/destacamos/destacamos.mapper.js';
import type { DestacamosPayload } from '#infrastructure/adapters/sources/dating/destacamos/destacamos.types.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const BASE_PAYLOAD: DestacamosPayload = {
  sourceId: '92345',
  sourceUrl: 'https://www.destacamos.net/92345-elena-escort-madrid.html',
  title: 'Elena',
  nickname: 'Elena',
  bio: 'Hola soy Elena, escort independiente en Madrid.',
  params: {
    age: '26',
    nationality: 'Española',
    city: 'Madrid',
    zone: 'Centro',
    heightRaw: "entre 1'60 y 1'70",
    hairColor: 'Morena',
    languages: ['Español', 'Inglés'],
    schedule: '24 horas',
  },
  phone: '612345678',
  whatsappPhone: '+34612345678',
  whatsappHref: 'https://wa.me/34612345678',
  isPremium: true,
  photos: [
    { src: 'https://cdn.destacamos.net/fotos/92345/1-g.jpg', alt: 'foto 1' },
    { src: 'https://cdn.destacamos.net/fotos/92345/2-g.jpg', alt: 'foto 2' },
  ],
};

describe('mapDestacamos — core fields', () => {
  it('builds valid ScrapedProvider', async () => {
    const sp = await mapDestacamos(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.id).toContain('destacamos:92345');
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('sets nickname', async () => {
    const sp = await mapDestacamos(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.nickname).toBe('Elena');
  });

  it('phoneNumber = whatsapp (preferred)', async () => {
    const sp = await mapDestacamos(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.phoneNumber).toBe('+34612345678');
  });

  it('contactOptions has calls and whatsapp', async () => {
    const sp = await mapDestacamos(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.contactOptions).toContain('calls');
    expect(sp.contactOptions).toContain('whatsapp');
  });
});

describe('mapDestacamos — premium badge', () => {
  it('vip badge from isPremium=true', async () => {
    const sp = await mapDestacamos(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.badges.vip).toBe(true);
    expect(sp.statistics!.isVip).toBe(true);
  });

  it('vip badge false when not premium', async () => {
    const payload: DestacamosPayload = { ...BASE_PAYLOAD, isPremium: false };
    const sp = await mapDestacamos(payload, new FakeTaxonomyResolver());
    expect(sp.badges.vip).toBe(false);
    expect(sp.statistics!.isVip).toBe(false);
  });
});

describe('mapDestacamos — taxonomy resolution', () => {
  it('resolves city → baseCity.id contains "madrid"', async () => {
    const sp = await mapDestacamos(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.baseCity?.id).toContain('madrid');
  });

  it('resolves nationality → nationalityId contains "espanola"', async () => {
    const sp = await mapDestacamos(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.personalDetails.nationalityId).toContain('espanola');
  });

  it('city miss → baseCity undefined', async () => {
    const resolver = new FakeTaxonomyResolver({ misses: { city: new Set(['madrid']) } });
    const sp = await mapDestacamos(BASE_PAYLOAD, resolver);
    expect(sp.baseCity).toBeUndefined();
  });
});

describe('mapDestacamos — personalDetails', () => {
  it('maps age', async () => {
    const sp = await mapDestacamos(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.personalDetails.ageYears).toBe(26);
  });

  it("maps height: 'entre 1'60 y 1'70' → 160", async () => {
    const sp = await mapDestacamos(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.personalDetails.heightCm).toBe(160);
  });

  it('defaults ageYears to 0 when missing', async () => {
    const payload: DestacamosPayload = {
      ...BASE_PAYLOAD,
      params: { ...BASE_PAYLOAD.params, age: undefined },
    };
    const sp = await mapDestacamos(payload, new FakeTaxonomyResolver());
    expect(sp.personalDetails.ageYears).toBe(0);
  });
});

describe('mapDestacamos — photos', () => {
  it('maps photos with isPrimary', async () => {
    const sp = await mapDestacamos(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    expect(sp.statistics!.photoCount).toBe(2);
  });
});

describe('mapDestacamos — attributes & externalRefs', () => {
  it('attributes contain hairColor, heightCm, languages', async () => {
    const sp = await mapDestacamos(BASE_PAYLOAD, new FakeTaxonomyResolver());
    const attrs = sp.attributes as Record<string, unknown>;
    expect(attrs.hairColor).toBe('Morena');
    expect(attrs.heightCm).toBe(160);
    expect(attrs.languages).toEqual(['Español', 'Inglés']);
  });

  it('externalRefs has source=destacamos', async () => {
    const sp = await mapDestacamos(BASE_PAYLOAD, new FakeTaxonomyResolver());
    const ref = sp.externalRefs.find((r) => r.source === 'destacamos');
    expect(ref).toBeDefined();
    expect(ref?.sourceId).toBe('92345');
  });

  it('metadata.adapterVersion = v2', async () => {
    const sp = await mapDestacamos(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect((sp.metadata as Record<string, unknown>).adapterVersion).toBe('v2');
  });
});
