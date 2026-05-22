import { describe, expect, it } from 'vitest';

import { extractGirlsBcn } from '#infrastructure/adapters/sources/dating/girlsbcn/girlsbcn.extractor.js';
import { mapGirlsBcn } from '#infrastructure/adapters/sources/dating/girlsbcn/girlsbcn.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { listHtmlFixtures, loadHtmlFixture } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://www.girlsbcn.net/escort/gbcamila105.html';

describe('GirlsBCN pipeline — HTML → ScrapedProvider', () => {
  it('produces a valid ScrapedProvider for camila105', async () => {
    const html = loadHtmlFixture('camila105.html');
    const payload = extractGirlsBcn(html, SOURCE_URL);
    const sp = await mapGirlsBcn(payload, new FakeTaxonomyResolver());

    expect(sp.id).toBeTruthy();
    expect(sp.nickname).toBe('Camila');
    expect(sp.vertical).toBe('dating');
    expect(sp.photos.length).toBeGreaterThan(0);
    expect(sp.externalRefs[0]!.source).toBe('girlsbcn');
  });

  it('processes all HTML fixtures without throwing', async () => {
    const files = listHtmlFixtures();
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const html = loadHtmlFixture(file);
      const payload = extractGirlsBcn(
        html,
        `https://www.girlsbcn.net/escort/${file.replace('.html', '')}.html`,
      );
      await expect(mapGirlsBcn(payload, new FakeTaxonomyResolver())).resolves.not.toThrow();
    }
  });
});
