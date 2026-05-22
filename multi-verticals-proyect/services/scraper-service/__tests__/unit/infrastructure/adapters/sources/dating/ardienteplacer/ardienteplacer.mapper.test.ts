import { describe, expect, it } from 'vitest';

import type { ArdientePlacerPayload } from '#infrastructure/adapters/sources/dating/ardienteplacer/ardienteplacer.types.js';
import { mapArdienteplacer } from '#infrastructure/adapters/sources/dating/ardienteplacer/ardienteplacer.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const BASE_PAYLOAD: ArdientePlacerPayload = {
  sourceId: '92010',
  sourceUrl: 'https://www.ardienteplacer.com/index.php/escort/putas-guarras/madrid/632277902/92010',
  title: 'Carmen - Escort independiente Madrid',
  nickname: 'Carmen',
  bio: 'Hola soy Carmen, escort independiente en Madrid. Tengo piso propio.',
  params: {
    age: '28 años',
    nationality: 'España',
    city: 'Madrid',
    rateRaw: '80 €/hora',
  },
  services: ['Francés natural', 'Masajes eróticos', 'Servicio completo'],
  phone: '632277902',
  whatsappPhone: '+34632277902',
  whatsappHref: 'https://wa.me/34632277902?text=Hola',
  photos: [
    { src: '/anuncios/92010/92010-1-g.jpg', alt: 'foto 1' },
    { src: '/anuncios/92010/92010-2-g.jpg', alt: 'foto 2' },
  ],
};

describe('mapArdienteplacer — core fields', () => {
  it('builds valid ScrapedProvider', async () => {
    const sp = await mapArdienteplacer(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.id).toContain('ardienteplacer:92010');
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('sets nickname', async () => {
    const sp = await mapArdienteplacer(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.nickname).toBe('Carmen');
  });

  it('phoneNumber = whatsapp (preferred)', async () => {
    const sp = await mapArdienteplacer(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.phoneNumber).toBe('+34632277902');
  });

  it('contactOptions has calls and whatsapp', async () => {
    const sp = await mapArdienteplacer(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.contactOptions).toContain('calls');
    expect(sp.contactOptions).toContain('whatsapp');
  });
});

describe('mapArdienteplacer — taxonomy resolution', () => {
  it('resolves city → baseCity.id contains "madrid"', async () => {
    const sp = await mapArdienteplacer(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.baseCity?.id).toContain('madrid');
  });

  it('resolves nationality → nationalityId contains "espana"', async () => {
    const sp = await mapArdienteplacer(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.personalDetails.nationalityId).toContain('espana');
  });

  it('city miss → baseCity undefined', async () => {
    const resolver = new FakeTaxonomyResolver({ misses: { city: new Set(['madrid']) } });
    const sp = await mapArdienteplacer(BASE_PAYLOAD, resolver);
    expect(sp.baseCity).toBeUndefined();
  });

  it('nationality miss → nationalityId undefined', async () => {
    const resolver = new FakeTaxonomyResolver({ misses: { nationality: new Set(['espana']) } });
    const sp = await mapArdienteplacer(BASE_PAYLOAD, resolver);
    expect(sp.personalDetails.nationalityId).toBeUndefined();
  });
});

describe('mapArdienteplacer — personalDetails', () => {
  it('maps age', async () => {
    const sp = await mapArdienteplacer(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.personalDetails.ageYears).toBe(28);
  });

  it('defaults ageYears to 0 when age missing', async () => {
    const payload: ArdientePlacerPayload = {
      ...BASE_PAYLOAD,
      params: { ...BASE_PAYLOAD.params, age: undefined },
    };
    const sp = await mapArdienteplacer(payload, new FakeTaxonomyResolver());
    expect(sp.personalDetails.ageYears).toBe(0);
  });
});

describe('mapArdienteplacer — prices from rate', () => {
  it('maps rate to prices array', async () => {
    const sp = await mapArdienteplacer(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.prices).toHaveLength(1);
    expect(sp.prices[0]).toMatchObject({ slot: 'h1', amount: 80, currency: 'EUR' });
  });

  it('empty prices when no rate', async () => {
    const payload: ArdientePlacerPayload = {
      ...BASE_PAYLOAD,
      params: { ...BASE_PAYLOAD.params, rateRaw: undefined },
    };
    const sp = await mapArdienteplacer(payload, new FakeTaxonomyResolver());
    expect(sp.prices).toHaveLength(0);
  });
});

describe('mapArdienteplacer — photos', () => {
  it('maps photos ordered with isPrimary', async () => {
    const sp = await mapArdienteplacer(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    expect(sp.photos[1]!.isPrimary).toBe(false);
    expect(sp.statistics!.photoCount).toBe(2);
  });
});

describe('mapArdienteplacer — attributes & externalRefs', () => {
  it('attributes contains services', async () => {
    const sp = await mapArdienteplacer(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect((sp.attributes as Record<string, unknown>).services).toEqual(BASE_PAYLOAD.services);
  });

  it('externalRefs has source=ardienteplacer', async () => {
    const sp = await mapArdienteplacer(BASE_PAYLOAD, new FakeTaxonomyResolver());
    const ref = sp.externalRefs.find((r) => r.source === 'ardienteplacer');
    expect(ref).toBeDefined();
    expect(ref?.sourceId).toBe('92010');
  });

  it('metadata.adapterVersion = v2', async () => {
    const sp = await mapArdienteplacer(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect((sp.metadata as Record<string, unknown>).adapterVersion).toBe('v2');
  });
});
