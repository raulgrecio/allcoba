import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { SourceRegistry } from '#infrastructure/adapters/sources/source.registry.js';

import { listDatingFixtures, loadDatingFixture } from '../../../../../utils/fixture-loader.js';

describe('Dating Adapters Fixture Comparison', () => {
  const fixtureNames = listDatingFixtures();
  const mockCrawler = {} as CrawlerPort;
  const registry = new SourceRegistry(mockCrawler);
  const fixturesPath = path.join(
    process.cwd(),
    '__tests__/fixtures/infrastructure/adapters/sources/dating',
  );

  fixtureNames.forEach((fixtureName) => {
    it(`should extract data correctly for ${fixtureName}`, async () => {
      if (fixtureName.startsWith('topescortbabes')) {
        return;
      }

      // Check if HTML file exists, skip if not to avoid loading errors
      const htmlPath = path.join(fixturesPath, `${fixtureName}.html`);
      if (!fs.existsSync(htmlPath)) {
        console.warn(`Skipping fixture ${fixtureName} because HTML file is missing at ${htmlPath}`);
        return;
      }

      const fixture = loadDatingFixture(fixtureName);

      const url = fixture.json.url || fixture.json.metadata?.sourceUrl;

      if (!url) {
        throw new Error(`Fixture ${fixtureName} is missing a URL in its JSON metadata`);
      }

      const adapter = await registry.resolve(url);

      const extracted = await adapter.extract(url, {
        html: fixture.html,
      });

      // Compare only the 'data' part of the ScrapedData
      const cleanObject = (obj: any): any => {
        if (obj === undefined || obj === null) return '';
        if (typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(cleanObject);

        const cleaned: any = {};
        const skipFields = [
          'id',
          'externalIds',
          'createdAt',
          'updatedAt',
          'lastScrapedAt',
          'extractedAt',
          'timestamp',
          'durationMs',
          'userAgent',
          'outboundIp',
          'serverIp',
          'signals',
          'confidenceScore',
          'verificationStatus',
          'vertical',
        ];

        for (const [key, value] of Object.entries(obj)) {
          if (skipFields.includes(key)) continue;

          if (typeof value === 'string') {
            cleaned[key] = value.replace(/\s+/g, ' ').trim();
          } else if (value === undefined || value === null) {
            cleaned[key] = '';
          } else if (typeof value === 'object') {
            cleaned[key] = cleanObject(value);
          } else {
            cleaned[key] = value;
          }
        }
        return cleaned;
      };

      const cleanedExtracted = cleanObject(extracted.data);
      const cleanedExpected = cleanObject(fixture.json);

      // Only compare fields that are present in both or that we care about
      const fieldsToCompare = ['attributes', 'description', 'contacts', 'phones', 'location'];

      for (const field of fieldsToCompare) {
        if (cleanedExpected[field] !== undefined) {
          expect(cleanedExtracted[field]).toMatchObject(cleanedExpected[field]);
        }
      }
    });
  });
});
