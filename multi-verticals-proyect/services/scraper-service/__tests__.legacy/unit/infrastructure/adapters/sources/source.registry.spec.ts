import { describe, expect, it } from 'vitest';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { SourceRegistry } from '#infrastructure/adapters/sources/source.registry.js';

describe('SourceRegistry', () => {
  const registry = new SourceRegistry({} as CrawlerPort);

  it('should resolve Idealista adapter', async () => {
    const source = await registry.resolve('https://www.idealista.com/inmueble/123');
    expect(source.identifier).toBe('idealista');
  });

  it('should resolve Fotocasa adapter', async () => {
    const source = await registry.resolve('https://www.fotocasa.es/es/comprar/vivienda/madrid');
    expect(source.identifier).toBe('fotocasa');
  });

  it('should resolve Coches.net adapter', async () => {
    const source = await registry.resolve('https://www.coches.net/segunda-mano/');
    expect(source.identifier).toBe('coches-net');
  });

  it('should resolve Wallapop adapter', async () => {
    const source = await registry.resolve('https://es.wallapop.com/item/pc-gaming-123');
    expect(source.identifier).toBe('wallapop');
  });

  it('should resolve TopEscortBabes adapter', async () => {
    const source = await registry.resolve('https://www.topescortbabes.com/es/spain/escorts/madrid');
    expect(source.identifier).toBe('topescortbabes');
  });

  it('should resolve ArdientePlacer adapter', async () => {
    const source = await registry.resolve('https://www.ardienteplacer.com/escorts/madrid');
    expect(source.identifier).toBe('ardienteplacer');
  });

  it('should resolve Bluemove adapter', async () => {
    const source = await registry.resolve('https://www.bluemove.es/escorts/madrid');
    expect(source.identifier).toBe('bluemove');
  });

  it('should resolve Chicasmalas adapter', async () => {
    const source = await registry.resolve('https://www.chicasmalas.es/escorts/madrid');
    expect(source.identifier).toBe('chicasmalas');
  });

  it('should resolve Citapasion adapter', async () => {
    const source = await registry.resolve('https://www.citapasion.com/escorts/madrid');
    expect(source.identifier).toBe('citapasion');
  });

  it('should resolve Destacamos adapter', async () => {
    const source = await registry.resolve('https://www.destacamos.net/escorts/madrid');
    expect(source.identifier).toBe('destacamos');
  });

  it('should resolve Erosguia adapter', async () => {
    const source = await registry.resolve('https://www.erosguia.com/escorts/madrid');
    expect(source.identifier).toBe('erosguia');
  });

  it('should resolve EscortAdvisor adapter', async () => {
    const source = await registry.resolve('https://www.escort-advisor.xxx/es/madrid');
    expect(source.identifier).toBe('escort-advisor');
  });

  it('should resolve EuroGirlsEscort adapter', async () => {
    const source = await registry.resolve('https://www.eurogirlsescort.com/es/madrid');
    expect(source.identifier).toBe('eurogirlsescort');
  });

  it('should resolve Gemidos adapter', async () => {
    const source = await registry.resolve('https://www.gemidos.tv/escorts/madrid');
    expect(source.identifier).toBe('gemidos');
  });

  it('should resolve GirlsBCN adapter', async () => {
    const source = await registry.resolve('https://www.girlsbcn.com/escorts/madrid');
    expect(source.identifier).toBe('girlsbcn');
  });

  it('should resolve GirlsMadrid adapter', async () => {
    const source = await registry.resolve('https://www.girlsmadrid.com/escorts/madrid');
    expect(source.identifier).toBe('girlsmadrid');
  });

  it('should resolve HotValencia adapter', async () => {
    const source = await registry.resolve('https://www.hotvalencia.com/escorts/madrid');
    expect(source.identifier).toBe('hotvalencia');
  });

  it('should resolve Loquosex adapter', async () => {
    const source = await registry.resolve('https://www.loquosex.com/escorts/madrid');
    expect(source.identifier).toBe('loquosex');
  });

  it('should resolve Madrid69 adapter', async () => {
    const source = await registry.resolve('https://www.madrid69.com/escorts/madrid');
    expect(source.identifier).toBe('madrid69');
  });

  it('should resolve Milescorts adapter', async () => {
    const source = await registry.resolve('https://www.milescorts.es/escorts/madrid');
    expect(source.identifier).toBe('milescorts');
  });

  it('should resolve Milpasiones adapter', async () => {
    const source = await registry.resolve('https://www.milpasiones.com/escorts/madrid');
    expect(source.identifier).toBe('milpasiones');
  });

  it('should resolve Mislios adapter', async () => {
    const source = await registry.resolve('https://www.mislios.com/escorts/madrid');
    expect(source.identifier).toBe('mislios');
  });

  it('should resolve Nuevoloquo adapter', async () => {
    const source = await registry.resolve('https://www.nuevoloquo.com/escorts/madrid');
    expect(source.identifier).toBe('nuevoloquo');
  });

  it('should resolve Nuevapasion adapter', async () => {
    const source = await registry.resolve('https://www.nuevapasion.com/escorts/madrid');
    expect(source.identifier).toBe('nuevapasion');
  });

  it('should resolve DiscoveryAdapter for unknown URLs', async () => {
    const source = await registry.resolve('https://unknown-site.com');
    expect(source.identifier).toBe('discovery');
  });
});
