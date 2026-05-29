import { describe, expect, it } from 'vitest';

import { extractErosguia } from '#infrastructure/adapters/sources/dating/erosguia/erosguia.extractor.js';
import { mapErosguia } from '#infrastructure/adapters/sources/dating/erosguia/erosguia.mapper.js';

import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { listHtmlFixtures, loadHtmlFixture } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://www.erosguia.com/55383.html';

describe('Erosguia pipeline — HTML → ScrapedProvider', () => {
  it('produces a valid ScrapedProvider for anny_55383', async () => {
    const html = loadHtmlFixture('anny_55383.html');
    const payload = extractErosguia(html, SOURCE_URL);
    const sp = await mapErosguia(payload, new FakeTaxonomyResolver());

    expect(sp.id).toBeTruthy();
    expect(sp.nickname).toBe('Anny');
    expect(sp.vertical).toBe('dating');
    expect(sp.photos.length).toBeGreaterThan(0);
    expect(sp.externalRefs[0]!.source).toBe('erosguia');
    expect(sp.baseCity?.id).toContain('madrid');
    expect(sp.personalDetails.ageYears).toBe(22);
  });

  it('processes all HTML fixtures without throwing', async () => {
    const files = listHtmlFixtures();
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const html = loadHtmlFixture(file);
      const idMatch = file.match(/_(\d+)\.html$/);
      const id = idMatch ? idMatch[1]! : '00000';
      const url = `https://www.erosguia.com/${id}.html`;
      const payload = extractErosguia(html, url);
      await expect(mapErosguia(payload, new FakeTaxonomyResolver())).resolves.not.toThrow();
    }
  });

  it('metadata.source = erosguia', async () => {
    const html = loadHtmlFixture('anny_55383.html');
    const payload = extractErosguia(html, SOURCE_URL);
    const sp = await mapErosguia(payload, new FakeTaxonomyResolver());
    expect(sp.metadata['source']).toBe('erosguia');
  });

  it('telegram present in otherPlatforms', async () => {
    const html = loadHtmlFixture('anny_55383.html');
    const payload = extractErosguia(html, SOURCE_URL);
    const sp = await mapErosguia(payload, new FakeTaxonomyResolver());
    expect(sp.otherPlatforms.some((p) => p.platform === 'telegram')).toBe(true);
  });

  it('call phone and WA phone both captured', async () => {
    const html = loadHtmlFixture('anny_55383.html');
    const payload = extractErosguia(html, SOURCE_URL);
    expect(payload.phone).toBe('614246033');
    expect(payload.whatsappPhone).toBe('+34643435399');
  });
});
