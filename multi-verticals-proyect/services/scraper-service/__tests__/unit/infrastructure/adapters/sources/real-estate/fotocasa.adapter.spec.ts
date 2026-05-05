import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { FotocasaAdapter } from '@scraper/infrastructure/adapters/sources/real-estate/fotocasa.adapter.js';
import { PlaywrightCrawler } from '@scraper/infrastructure/crawler/playwright-crawler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Unit: FotocasaAdapter (Offline)', () => {
  it(
    'debería extraer correctamente los campos básicos usando el HTML persistido',
    async () => {
      const htmlPath = path.resolve(
        __dirname,
        '../../../../../../storage/raw/fotocasa_188764809.html',
      );
      const html = await fs.readFile(htmlPath, 'utf-8');

      const mockCrawler: any = {
        fetch: async () => ({
          html,
          status: 200,
          userAgent: 'test-ua',
        }),
      };

      const adapter = new FotocasaAdapter(mockCrawler);
      const { data } = await adapter.extract(
        'https://www.fotocasa.es/es/comprar/vivienda/madrid-capital/188764809/d',
      );

      // 1. Identificación básica
      expect(data.source).toBe('fotocasa');
      expect(data.externalId).toBe('188764809');

      // 2. Datos numéricos (que sí están en el HTML)
      expect(data.price).toBeGreaterThan(0);

      // El teléfono puede ser dinámico (JS), en offline podría estar vacío
      expect(Array.isArray(data.phones)).toBe(true);
      if (data.phones.length > 0) {
        expect(data.phones[0]).toMatch(/^\+?[\d\s]+$/);
      }
      expect(data.attributes.rooms).toBe(2); // El HTML dice "2 habs."
      expect(data.attributes.bathrooms).toBe(2); // El HTML dice "2 baños"
      expect(data.attributes.surface).toBe(80); // El HTML dice "80 m²"

      // 3. Teléfonos (Nota: Fotocasa a veces los oculta tras JS)
      // No fallamos el test si no hay teléfonos en el mock,
      // pero si los hay, verificamos que no sean nulos.
      if (data.phones.length > 0) {
        expect(data.phones[0]).toMatch(/^\+?[0-9 ]+$/);
      }
    },
    { timeout: 15000 },
  );
});
