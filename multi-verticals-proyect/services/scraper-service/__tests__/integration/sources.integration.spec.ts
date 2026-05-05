import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import { describe, expect, it, vi } from 'vitest';

import { ConsolidationService } from '@scraper/domain/services/consolidation.service.js';
import { FotocasaAdapter } from '@scraper/infrastructure/adapters/sources/real-estate/fotocasa.adapter.js';
import { IdealistaAdapter } from '@scraper/infrastructure/adapters/sources/real-estate/idealista.adapter.js';

describe('Integration: Source Adapters with Real HTML', () => {
  const fixturesDir = path.resolve(__dirname, '../fixtures/html');
  const jsonFixturesDir = path.resolve(__dirname, '../fixtures/json');
  const consolidationService = new ConsolidationService();

  it('debería extraer y consolidar datos correctamente de un caso real de Fotocasa', async () => {
    // 1. Cargar HTML y JSON de referencia
    const html = await fs.readFile(path.join(fixturesDir, 'fotocasa_188764809.html'), 'utf-8');
    const providersJson = JSON.parse(
      await fs.readFile(path.join(jsonFixturesDir, 'providers.json'), 'utf-8'),
    );
    const expectedProvider = providersJson[0];

    const adapter = new FotocasaAdapter();
    const $ = cheerio.load(html);
    const url =
      'https://www.fotocasa.es/es/comprar/vivienda/madrid-capital/aire-acondicionado-calefaccion-ascensor-amueblado/188764809/d';

    // 2. Extraer datos crudos
    const rawData = await (adapter as any).performExtraction($, url);

    // 3. Consolidar (Verificar que el consolidador toma las decisiones correctas)
    const result = consolidationService.consolidate(rawData, []); // Sin candidatos previos

    expect(result.action).toBe('CREATE');
    expect(result.mergedData.price).toBe(expectedProvider.price);
    expect(result.mergedData.phones).toContain(expectedProvider.phones[0]);
    expect(result.mergedData.externalIds?.fotocasa).toBe(expectedProvider.externalIds.fotocasa);

    // Verificar atributos específicos (habitaciones, superficie, etc)
    expect(result.mergedData.attributes!.rooms).toBe(expectedProvider.attributes.rooms);
    expect(result.mergedData.attributes!.bathrooms).toBe(expectedProvider.attributes.bathrooms);
    expect(result.mergedData.attributes!.surface).toBe(expectedProvider.attributes.surface);
  });

  it('debería manejar correctamente el HTML real de Idealista', async () => {
    // Nota: El archivo capturado de Idealista parece ser pequeño (1.5KB),
    // probablemente una pantalla de captcha o bloqueo. Vamos a verificarlo.
    const html = await fs.readFile(path.join(fixturesDir, 'idealista_110715434.html'), 'utf-8');
    const adapter = new IdealistaAdapter();
    const $ = cheerio.load(html);
    const url = 'https://www.idealista.com/inmueble/110715434/';

    const data = await (adapter as any).performExtraction($, url);

    expect(data.source).toBe('idealista');
    expect(data.externalId).toBe('110715434');
    // Si el HTML es un bloqueo, aquí veremos si el adapter sobrevive o falla
  });
});
