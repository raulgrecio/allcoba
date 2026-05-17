import fs from 'fs/promises';
import path from 'path';
import { describe, expect, it } from 'vitest';
import * as cheerio from 'cheerio';

import { FotocasaAdapter } from '#infrastructure/adapters/sources/real-estate/fotocasa.adapter.js';
import { IdealistaAdapter } from '#infrastructure/adapters/sources/real-estate/idealista.adapter.js';

describe('Integration: Source Adapters with Real HTML', () => {
  const fixturesDir = path.resolve(
    __dirname,
    '../fixtures/infrastructure/adapters/sources/real-estate',
  );
  const jsonFixturesDir = path.resolve(
    __dirname,
    '../fixtures/infrastructure/adapters/sources/real-estate',
  );

  it('extracts correct RawExtraction from Fotocasa HTML', async () => {
    const html = await fs.readFile(path.join(fixturesDir, 'fotocasa_188764809.html'), 'utf-8');
    const providersJson = JSON.parse(
      await fs.readFile(path.join(jsonFixturesDir, 'providers.json'), 'utf-8'),
    );
    const expected = providersJson[0];

    const adapter = new FotocasaAdapter({} as any);
    const $ = cheerio.load(html);
    const url =
      'https://www.fotocasa.es/es/comprar/vivienda/madrid-capital/aire-acondicionado-calefaccion-ascensor-amueblado/188764809/d';

    const rawData = await (adapter as any).performExtraction($, url);

    // Verify source adapter extracts the right primitive data
    expect(rawData.source).toBe('fotocasa');
    expect(rawData.price).toBe(expected.price);
    expect(rawData.phones).toContain(expected.phones[0]);
    expect(rawData.externalId).toBe(expected.externalIds.fotocasa);
    expect(rawData.attributes.rooms).toBe(expected.attributes.rooms);
    expect(rawData.attributes.bathrooms).toBe(expected.attributes.bathrooms);
    expect(rawData.attributes.surface).toBe(expected.attributes.surface);
  });

  it('survives Idealista HTML (may be captcha/block page)', async () => {
    const html = await fs.readFile(path.join(fixturesDir, 'idealista_110715434.html'), 'utf-8');
    const adapter = new IdealistaAdapter({} as any);
    const $ = cheerio.load(html);
    const url = 'https://www.idealista.com/inmueble/110715434/';

    const data = await (adapter as any).performExtraction($, url);

    expect(data.source).toBe('idealista');
    expect(data.externalId).toBe('110715434');
  });
});
