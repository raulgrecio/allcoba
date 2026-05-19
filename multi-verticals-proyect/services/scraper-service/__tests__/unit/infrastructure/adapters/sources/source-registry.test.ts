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
});
