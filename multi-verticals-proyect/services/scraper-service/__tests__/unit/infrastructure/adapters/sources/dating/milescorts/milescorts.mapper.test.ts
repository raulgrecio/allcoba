import { describe, expect, it } from 'vitest';

import type { MilescortsPayload } from '#infrastructure/adapters/sources/dating/milescorts/milescorts.types.js';
import { mapMilescorts } from '#infrastructure/adapters/sources/dating/milescorts/milescorts.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const BASE_PAYLOAD: MilescortsPayload = {
  sourceId: '396681',
  sourceUrl:
    'https://www.milescorts.es/escorts-y-putas/madrid-ciudad/631594827-escort-sexy-396681.htm',
  title: 'Tania, escort sexy en tu zona',
  nickname: 'Tania',
  bio: 'Hola soy Tania, una chica joven. Tengo piso propio. Hago salidas a hoteles.',
  params: {
    age: '24 años',
    nationality: 'Española',
    city: 'madrid ciudad',
  },
  phone: '631594827',
  whatsappPhone: '+34631594827',
  whatsappHref: 'https://wa.me/34631594827',
  isVerified: true,
  photos: [
    { src: 'https://cdn.milescorts.es/fotos/396681/1.jpg', alt: 'foto 1' },
    { src: 'https://cdn.milescorts.es/fotos/396681/2.jpg', alt: 'foto 2' },
  ],
};

describe('mapMilescorts — core fields', () => {
  it('builds valid ScrapedProvider', async () => {
    const sp = await mapMilescorts(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.id).toContain('milescorts:396681');
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('sets nickname', async () => {
    const sp = await mapMilescorts(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.nickname).toBe('Tania');
  });

  it('phoneNumber = whatsapp (preferred)', async () => {
    const sp = await mapMilescorts(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.phoneNumber).toBe('+34631594827');
  });

  it('phoneNumber falls back to call phone', async () => {
    const payload: MilescortsPayload = {
      ...BASE_PAYLOAD,
      whatsappPhone: undefined,
      whatsappHref: undefined,
    };
    const sp = await mapMilescorts(payload, new FakeTaxonomyResolver());
    expect(sp.phoneNumber).toBe('631594827');
  });

  it('contactOptions has calls and whatsapp', async () => {
    const sp = await mapMilescorts(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.contactOptions).toContain('calls');
    expect(sp.contactOptions).toContain('whatsapp');
  });
});

describe('mapMilescorts — verified badge', () => {
  it('badges.verified = true when isVerified', async () => {
    const sp = await mapMilescorts(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.badges.verified).toBe(true);
    expect(sp.statistics!.isVerified).toBe(true);
  });

  it('badges.verified = false when not verified', async () => {
    const payload: MilescortsPayload = { ...BASE_PAYLOAD, isVerified: false };
    const sp = await mapMilescorts(payload, new FakeTaxonomyResolver());
    expect(sp.badges.verified).toBe(false);
    expect(sp.statistics!.isVerified).toBe(false);
  });
});

describe('mapMilescorts — taxonomy resolution', () => {
  it('resolves city → baseCity.id contains "madrid-ciudad"', async () => {
    const sp = await mapMilescorts(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.baseCity?.id).toContain('madrid-ciudad');
  });

  it('resolves nationality → personalDetails.nationalityId contains "espanola"', async () => {
    const sp = await mapMilescorts(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.personalDetails.nationalityId).toContain('espanola');
  });

  it('city miss → baseCity undefined', async () => {
    const resolver = new FakeTaxonomyResolver({
      misses: { city: new Set(['madrid-ciudad']) },
    });
    const sp = await mapMilescorts(BASE_PAYLOAD, resolver);
    expect(sp.baseCity).toBeUndefined();
  });

  it('nationality miss → nationalityId undefined', async () => {
    const resolver = new FakeTaxonomyResolver({
      misses: { nationality: new Set(['espanola']) },
    });
    const sp = await mapMilescorts(BASE_PAYLOAD, resolver);
    expect(sp.personalDetails.nationalityId).toBeUndefined();
  });
});

describe('mapMilescorts — personalDetails', () => {
  it('maps age', async () => {
    const sp = await mapMilescorts(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.personalDetails.ageYears).toBe(24);
  });

  it('defaults ageYears to 0 when age missing', async () => {
    const payload: MilescortsPayload = {
      ...BASE_PAYLOAD,
      params: { ...BASE_PAYLOAD.params, age: undefined },
    };
    const sp = await mapMilescorts(payload, new FakeTaxonomyResolver());
    expect(sp.personalDetails.ageYears).toBe(0);
  });
});

describe('mapMilescorts — photos', () => {
  it('maps photos with correct order and isPrimary', async () => {
    const sp = await mapMilescorts(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    expect(sp.photos[1]!.isPrimary).toBe(false);
    expect(sp.statistics!.photoCount).toBe(2);
  });
});

describe('mapMilescorts — externalRefs & metadata', () => {
  it('externalRefs has source=milescorts', async () => {
    const sp = await mapMilescorts(BASE_PAYLOAD, new FakeTaxonomyResolver());
    const ref = sp.externalRefs.find((r) => r.source === 'milescorts');
    expect(ref).toBeDefined();
    expect(ref?.sourceId).toBe('396681');
  });

  it('metadata.adapterVersion = v2', async () => {
    const sp = await mapMilescorts(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect((sp.metadata as Record<string, unknown>).adapterVersion).toBe('v2');
  });

  it('attributes.isVerified matches payload', async () => {
    const sp = await mapMilescorts(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect((sp.attributes as Record<string, unknown>).isVerified).toBe(true);
  });
});
