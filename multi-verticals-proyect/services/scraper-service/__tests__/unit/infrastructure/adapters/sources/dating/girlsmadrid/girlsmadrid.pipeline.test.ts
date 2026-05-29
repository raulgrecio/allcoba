import { describe, expect, it } from 'vitest';

import { extractGirlsMadrid } from '#infrastructure/adapters/sources/dating/girlsmadrid/girlsmadrid.extractor.js';
import { mapGirlsMadrid } from '#infrastructure/adapters/sources/dating/girlsmadrid/girlsmadrid.mapper.js';

import { FakeTaxonomyResolver } from '../girlsbcn/helpers/fake-taxonomy-resolver.js';
import { listHtmlFixtures, loadHtmlFixture } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://www.girlsmadrid.com/escort-lucia167.html';

describe('GirlsMadrid pipeline — HTML → ScrapedProvider', () => {
  it('produces a valid ScrapedProvider for lucia167', async () => {
    const html = loadHtmlFixture('lucia167.html');
    const payload = extractGirlsMadrid(html, SOURCE_URL);
    const sp = await mapGirlsMadrid(payload, new FakeTaxonomyResolver());

    expect(sp.id).toBeTruthy();
    expect(sp.nickname).toBe('Lucia Haro');
    expect(sp.vertical).toBe('dating');
    expect(sp.photos.length).toBeGreaterThan(0);
    expect(sp.externalRefs[0]!.source).toBe('girlsmadrid');
    expect(sp.baseCity?.id).toContain('madrid');
    expect(sp.personalDetails.ageYears).toBe(22);
  });

  it('processes all HTML fixtures without throwing', async () => {
    const files = listHtmlFixtures();
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const html = loadHtmlFixture(file);
      const sourceId = file.replace('.html', '');
      const payload = extractGirlsMadrid(html, `https://www.girlsmadrid.com/${sourceId}.html`);
      await expect(mapGirlsMadrid(payload, new FakeTaxonomyResolver())).resolves.not.toThrow();
    }
  });

  it('source discriminant is girlsmadrid not girlsbcn', async () => {
    const html = loadHtmlFixture('lucia167.html');
    const payload = extractGirlsMadrid(html, SOURCE_URL);
    const sp = await mapGirlsMadrid(payload, new FakeTaxonomyResolver());
    expect(sp.metadata['source']).toBe('girlsmadrid');
  });

  it('meetingPlaces detected from tags', async () => {
    const html = loadHtmlFixture('lucia167.html');
    const payload = extractGirlsMadrid(html, SOURCE_URL);
    const sp = await mapGirlsMadrid(payload, new FakeTaxonomyResolver());
    expect(sp.meetingPlaces.outcall).toBe(true);
  });
});
