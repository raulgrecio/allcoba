import { describe, expect, it } from 'vitest';
import { extractEscortAdvisor } from '#infrastructure/adapters/sources/dating/escort-advisor/escort-advisor.extractor.js';
import { mapEscortAdvisor, ESCORT_ADVISOR_SOURCE } from '#infrastructure/adapters/sources/dating/escort-advisor/escort-advisor.mapper.js';
import { FakeTaxonomyResolver } from './helpers/fake-taxonomy-resolver.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://www.escort-advisor.xxx/escorts/spain/madrid/diana-667554247/';
const NOW = new Date('2026-01-01T00:00:00.000Z');

describe('escort-advisor pipeline — HTML → ScrapedProvider', () => {
  it('extract + map produces valid ScrapedProvider', async () => {
    const html = loadHtml('diana_667554247.html');
    const payload = extractEscortAdvisor(html, SOURCE_URL);
    const sp = await mapEscortAdvisor(payload, new FakeTaxonomyResolver(), { now: NOW });

    expect(sp.id).toContain(ESCORT_ADVISOR_SOURCE);
    expect(sp.nickname).toBe('Diana');
    expect(sp.phoneNumber).toBe('655447788');
    expect(sp.contactOptions).toContain('calls');
    expect(sp.photos).toHaveLength(2);
    expect(sp.badges.verified).toBe(true);
    expect(sp.personalDetails.ageYears).toBe(29);
    expect(sp.externalRefs[0]?.source).toBe(ESCORT_ADVISOR_SOURCE);
    expect(sp.lastScrapedAt).toBe(NOW.toISOString());
  });
});
