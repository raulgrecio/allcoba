/**
 * Unit tests for SourceRegistry.resolve().
 * Verifies URL-to-pipeline dispatch and fallback to DiscoveryAdapter.
 */

import { describe, expect, it, vi } from 'vitest';

import { SourceRegistry } from '#infrastructure/adapters/sources/source.registry.js';

const mockCrawler = { fetch: vi.fn(), close: vi.fn(), isAllowed: vi.fn() };

describe('SourceRegistry.resolve', () => {
  const registry = new SourceRegistry(mockCrawler as any);

  it('returns DiscoveryAdapter for unknown URL', async () => {
    const source = await registry.resolve('https://unknown-site.example.com/profile/1');
    expect((source as any).identifier).toBe('discovery');
  });

  it('returns IdealistaPipeline for idealista.com', async () => {
    const source = await registry.resolve('https://www.idealista.com/inmueble/12345/');
    expect((source as any).identifier).toBe('idealista');
  });

  it('returns FotocasaPipeline for fotocasa.es', async () => {
    const source = await registry.resolve('https://www.fotocasa.es/vi/inmueble/1');
    expect((source as any).identifier).toBe('fotocasa');
  });

  it('returns CochesNetPipeline for coches.net', async () => {
    const source = await registry.resolve('https://www.coches.net/seat-ibiza-123456-abc.aspx');
    expect((source as any).identifier).toBe('coches-net');
  });

  it('returns WallapopPipeline for wallapop.com', async () => {
    const source = await registry.resolve('https://es.wallapop.com/item/phone-abc');
    expect((source as any).identifier).toBe('wallapop');
  });

  it('returns GirlsBcnPipeline for girlsbcn.net', async () => {
    const source = await registry.resolve('https://www.girlsbcn.net/escort/test.html');
    expect((source as any).identifier).toBe('girlsbcn');
  });

  it('returns GirlsBcnPipeline for girlsbcn.com', async () => {
    const source = await registry.resolve('https://www.girlsbcn.com/escort/test.html');
    expect((source as any).identifier).toBe('girlsbcn');
  });

  it('returns ArdienteplacerPipeline for ardienteplacer.com', async () => {
    const source = await registry.resolve('https://ardienteplacer.com/escort/ciudad/zona/1/2');
    expect((source as any).identifier).toBe('ardienteplacer');
  });

  it('returns TopEscortBabesPipeline for topescortbabes.com', async () => {
    const source = await registry.resolve('https://topescortbabes.com/model/test');
    expect((source as any).identifier).toBe('topescortbabes');
  });

  it('returns ErosguiaPipeline for erosguia.com', async () => {
    const source = await registry.resolve('https://erosguia.com/escort/test');
    expect((source as any).identifier).toBe('erosguia');
  });

  it('returns BluemovePipeline for bluemove.es', async () => {
    const source = await registry.resolve('https://bluemove.es/perfil/test-user');
    expect((source as any).identifier).toBe('bluemove');
  });

  it('returns ChicasmalasPipeline for chicasmalas.es', async () => {
    const source = await registry.resolve('https://chicasmalas.es/escorts/madrid/username');
    expect((source as any).identifier).toBe('chicasmalas');
  });

  it('returns CitapasionPipeline for citapasion.com', async () => {
    const source = await registry.resolve('https://citapasion.com/escorts/17533');
    expect((source as any).identifier).toBe('citapasion');
  });

  it('returns DestacamosPipeline for destacamos.net', async () => {
    const source = await registry.resolve('https://destacamos.net/escort/test-user');
    expect((source as any).identifier).toBe('destacamos');
  });

  it('returns EscortAdvisorPipeline for escort-advisor.xxx', async () => {
    const source = await registry.resolve('https://escort-advisor.xxx/escorts/spain/madrid/diana/');
    expect((source as any).identifier).toBe('escort-advisor');
  });

  it('returns EuroGirlsEscortPipeline for eurogirlsescort.es', async () => {
    const source = await registry.resolve('https://eurogirlsescort.es/escort/test');
    expect((source as any).identifier).toBe('eurogirlsescort');
  });

  it('returns GemidosPipeline for gemidos.tv', async () => {
    const source = await registry.resolve('https://gemidos.tv/anuncio/test-escort');
    expect((source as any).identifier).toBe('gemidos');
  });

  it('returns GirlsmadridPipeline for girlsmadrid.com', async () => {
    const source = await registry.resolve('https://girlsmadrid.com/escort/test');
    expect((source as any).identifier).toBe('girlsmadrid');
  });

  it('returns HotvalenciaPipeline for hotvalencia.com', async () => {
    const source = await registry.resolve('https://hotvalencia.com/putas-valencia/escort-name');
    expect((source as any).identifier).toBe('hotvalencia');
  });

  it('returns LoquosexPipeline for loquosex.com', async () => {
    const source = await registry.resolve('https://loquosex.com/escort/test');
    expect((source as any).identifier).toBe('loquosex');
  });

  it('returns Madrid69Pipeline for madrid69.com', async () => {
    const source = await registry.resolve('https://madrid69.com/escort/test');
    expect((source as any).identifier).toBe('madrid69');
  });

  it('returns MilescortsPipeline for milescorts.es', async () => {
    const source = await registry.resolve('https://milescorts.es/escort/test');
    expect((source as any).identifier).toBe('milescorts');
  });

  it('returns MilpasionesPipeline for milpasiones.com', async () => {
    const source = await registry.resolve('https://milpasiones.com/escort/test');
    expect((source as any).identifier).toBe('milpasiones');
  });

  it('returns MisliosPipeline for mislios.com', async () => {
    const source = await registry.resolve('https://mislios.com/escort/test');
    expect((source as any).identifier).toBe('mislios');
  });

  it('returns NuevoloquoPipeline for nuevoloquo.es', async () => {
    const source = await registry.resolve('https://nuevoloquo.es/escort/test');
    expect((source as any).identifier).toBe('nuevoloquo');
  });

  it('returns NuevapasionPipeline for nuevapasion.com', async () => {
    const source = await registry.resolve('https://nuevapasion.com/escort/test');
    expect((source as any).identifier).toBe('nuevapasion');
  });
});
