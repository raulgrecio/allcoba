import { describe, expect, it } from 'vitest';

import { mapLoquosex } from '#infrastructure/adapters/sources/dating/loquosex/loquosex.mapper.js';
import type { LoquosexPayload } from '#infrastructure/adapters/sources/dating/loquosex/loquosex.types.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const BASE_PAYLOAD: LoquosexPayload = {
  sourceId: '677684329',
  sourceUrl: 'https://loquosex.com/ven-a-conocerme-677684329.html/',
  title: 'JOVEN Y GUAPA 677684329, HAGO TODO LOS SERVICIOS',
  nickname: 'JOVEN Y GUAPA',
  bio: 'Tengo piso. También hago salidas a hoteles. HOLA SOY una chica simpática.',
  params: {
    age: '25 años',
    nationality: 'Venezolana',
    city: 'Murcia',
    priceMin: '50 €',
    isPremium: false,
  },
  services: [
    { name: '24h', included: true },
    { name: 'Masajes', included: true },
    { name: 'Sado BDSM', included: false },
  ],
  phone: '677684329',
  whatsappPhone: '+34677684329',
  whatsappHref: 'https://api.whatsapp.com/send?phone=34677684329',
  photos: [
    { src: 'https://loquosex.com/img/photo1.jpg' },
    { src: 'https://loquosex.com/img/photo2.jpg' },
  ],
};

describe('mapLoquosex — core fields', () => {
  it('builds a valid ScrapedProvider', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.id).toContain('loquosex:677684329');
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('sets nickname from payload', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.nickname).toBe('JOVEN Y GUAPA');
  });

  it('sets phoneNumber (whatsapp preferred)', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.phoneNumber).toBe('+34677684329');
  });

  it('sets phoneNumber to call phone when no whatsapp', async () => {
    const payload: LoquosexPayload = {
      ...BASE_PAYLOAD,
      whatsappPhone: undefined,
      whatsappHref: undefined,
    };
    const sp = await mapLoquosex(payload, new FakeTaxonomyResolver());
    // call phone stored raw (9 digits, no country prefix)
    expect(sp.phoneNumber).toBe('677684329');
  });

  it('contactOptions includes whatsapp when present', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.contactOptions).toContain('whatsapp');
  });

  it('contactOptions includes calls when phone present', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.contactOptions).toContain('calls');
  });
});

describe('mapLoquosex — taxonomy resolution', () => {
  it('resolves city → baseCity.id contains "murcia"', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.baseCity?.id).toContain('murcia');
  });

  it('resolves nationality → personalDetails.nationalityId contains "venezolana"', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.personalDetails.nationalityId).toContain('venezolana');
  });

  it('city miss → baseCity undefined', async () => {
    const resolver = new FakeTaxonomyResolver({ misses: { city: new Set(['murcia']) } });
    const sp = await mapLoquosex(BASE_PAYLOAD, resolver);
    expect(sp.baseCity).toBeUndefined();
  });

  it('nationality miss → nationalityId undefined', async () => {
    const resolver = new FakeTaxonomyResolver({
      misses: { nationality: new Set(['venezolana']) },
    });
    const sp = await mapLoquosex(BASE_PAYLOAD, resolver);
    expect(sp.personalDetails.nationalityId).toBeUndefined();
  });
});

describe('mapLoquosex — personalDetails', () => {
  it('maps age', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.personalDetails.ageYears).toBe(25);
  });

  it('defaults ageYears to 0 when age missing', async () => {
    const payload: LoquosexPayload = {
      ...BASE_PAYLOAD,
      params: { ...BASE_PAYLOAD.params, age: undefined },
    };
    const sp = await mapLoquosex(payload, new FakeTaxonomyResolver());
    expect(sp.personalDetails.ageYears).toBe(0);
  });
});

describe('mapLoquosex — meeting places', () => {
  it('detects incall and outcall from bio', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.meetingPlaces.incall).toBe(true);
    expect(sp.meetingPlaces.outcall).toBe(true);
  });
});

describe('mapLoquosex — badges & statistics', () => {
  it('vip badge from isPremium=false', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.badges.vip).toBe(false);
    expect(sp.statistics!.isVip).toBe(false);
  });

  it('vip badge from isPremium=true', async () => {
    const payload: LoquosexPayload = {
      ...BASE_PAYLOAD,
      params: { ...BASE_PAYLOAD.params, isPremium: true },
    };
    const sp = await mapLoquosex(payload, new FakeTaxonomyResolver());
    expect(sp.badges.vip).toBe(true);
    expect(sp.statistics!.isVip).toBe(true);
  });

  it('photoCount matches photos array length', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.statistics!.photoCount).toBe(BASE_PAYLOAD.photos.length);
  });
});

describe('mapLoquosex — photos', () => {
  it('maps photos with correct order', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    expect(sp.photos[1]!.isPrimary).toBe(false);
    expect(sp.photos[0]!.order).toBe(0);
  });
});

describe('mapLoquosex — attributes & externalRefs', () => {
  it('attributes contains services, priceMin, isPremium', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.attributes).toMatchObject({
      services: BASE_PAYLOAD.services,
      priceMin: '50 €',
      isPremium: false,
    });
  });

  it('externalRefs has source=loquosex', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    const ref = sp.externalRefs.find((r) => r.source === 'loquosex');
    expect(ref).toBeDefined();
    expect(ref?.sourceId).toBe('677684329');
  });

  it('metadata.adapterVersion = v2', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect((sp.metadata as Record<string, unknown>).adapterVersion).toBe('v2');
  });
});

describe('mapLoquosex — no telegram', () => {
  it('no telegram in contactOptions', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.contactOptions).not.toContain('telegram');
  });

  it('encodedTelegram undefined', async () => {
    const sp = await mapLoquosex(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.encodedTelegram).toBeUndefined();
  });
});
