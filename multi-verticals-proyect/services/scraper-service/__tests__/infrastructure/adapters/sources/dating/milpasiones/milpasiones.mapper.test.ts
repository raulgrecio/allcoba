import { describe, expect, it } from 'vitest';

import { mapMilpasiones } from '#infrastructure/adapters/sources/dating/milpasiones/milpasiones.mapper.js';
import type { MilpasionesPayload } from '#infrastructure/adapters/sources/dating/milpasiones/milpasiones.types.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';

const BASE_PAYLOAD: MilpasionesPayload = {
  sourceId: '215990',
  sourceUrl:
    'https://milpasiones.com/anuncio/662583238-carinosa-morbosa_215990/',
  title: '662583238 NATALIA CARINOSA MORBOSA EN ESTEPONA',
  nickname: 'NATALIA',
  bio: 'Hola soy Natalia, venezolana con mucho cariño.',
  params: { city: 'Estepona' },
  phone: '662583238',
  photos: [
    { src: 'https://cdn.milpasiones.com/fotos/215990/1.jpg' },
    { src: 'https://cdn.milpasiones.com/fotos/215990/2.jpg' },
  ],
};

describe('mapMilpasiones — core fields', () => {
  it('builds valid ScrapedProvider', async () => {
    const sp = await mapMilpasiones(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.id).toContain('milpasiones:215990');
    expect(sp.vertical).toBe('dating');
    expect(sp.category).toBe('escorts');
  });

  it('sets nickname', async () => {
    const sp = await mapMilpasiones(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.nickname).toBe('NATALIA');
  });

  it('phoneNumber from call phone', async () => {
    const sp = await mapMilpasiones(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.phoneNumber).toBe('662583238');
  });

  it('contactOptions has calls', async () => {
    const sp = await mapMilpasiones(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.contactOptions).toContain('calls');
  });

  it('no whatsapp in contactOptions', async () => {
    const sp = await mapMilpasiones(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.contactOptions).not.toContain('whatsapp');
  });
});

describe('mapMilpasiones — taxonomy resolution', () => {
  it('resolves city → baseCity.cityId contains "estepona"', async () => {
    const sp = await mapMilpasiones(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.baseCity?.cityId).toContain('estepona');
  });

  it('city miss → baseCity undefined', async () => {
    const resolver = new FakeTaxonomyResolver({ misses: { city: new Set(['estepona']) } });
    const sp = await mapMilpasiones(BASE_PAYLOAD, resolver);
    expect(sp.baseCity).toBeUndefined();
  });
});

describe('mapMilpasiones — photos', () => {
  it('maps photos with isPrimary on first', async () => {
    const sp = await mapMilpasiones(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.photos).toHaveLength(2);
    expect(sp.photos[0]!.isPrimary).toBe(true);
    expect(sp.photos[1]!.isPrimary).toBe(false);
    expect(sp.statistics.photoCount).toBe(2);
  });
});

describe('mapMilpasiones — externalRefs & metadata', () => {
  it('externalRefs has source=milpasiones', async () => {
    const sp = await mapMilpasiones(BASE_PAYLOAD, new FakeTaxonomyResolver());
    const ref = sp.externalRefs.find((r) => r.source === 'milpasiones');
    expect(ref).toBeDefined();
    expect(ref?.sourceId).toBe('215990');
  });

  it('metadata.adapterVersion = v2', async () => {
    const sp = await mapMilpasiones(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect((sp.metadata as Record<string, unknown>).adapterVersion).toBe('v2');
  });

  it('confidence = low (JS-rendered body)', async () => {
    const sp = await mapMilpasiones(BASE_PAYLOAD, new FakeTaxonomyResolver());
    expect(sp.confidence).toBe(0.5);
  });
});
