import { describe, expect, it } from 'vitest';

import {
  extractProfileDataFromHtml,
  parseProfileDataScript,
} from '#infrastructure/adapters/sources/dating/topescortbabes/topescortbabes.extractor.js';

import { listHtmlFixtures, loadHtmlFixture } from './helpers/load-fixtures.js';

describe('parseProfileDataScript', () => {
  it('parses a minimal valid assignment', () => {
    const script = 'window.profileData = {"id":1178,"nickname":"Chanel"};window._req=1;';
    const out = parseProfileDataScript(script);
    expect(out?.id).toBe(1178);
    expect(out?.nickname).toBe('Chanel');
  });

  it('returns null when assignment is absent', () => {
    expect(parseProfileDataScript('console.log(1);')).toBeNull();
  });

  it('returns null when the body is malformed', () => {
    expect(parseProfileDataScript('window.profileData = {a:};window._req=1;')).toBeNull();
  });
});

describe('extractProfileDataFromHtml — synthetic', () => {
  it('finds the script tag and extracts the payload', () => {
    const html = `
      <html><body>
        <script>window.profileData = {"id":42,"nickname":"X","photos":[]};window._req=1;</script>
      </body></html>
    `;
    const out = extractProfileDataFromHtml(html);
    expect(out?.id).toBe(42);
  });

  it('returns null when no matching script', () => {
    expect(extractProfileDataFromHtml('<html><body>nope</body></html>')).toBeNull();
  });
});

describe('extractProfileDataFromHtml — real HTML captures', () => {
  const htmlFiles = listHtmlFixtures();

  it('discovers HTML fixture files', () => {
    expect(htmlFiles.length).toBeGreaterThanOrEqual(2);
    expect(htmlFiles).toContain('lera.html');
    expect(htmlFiles).toContain('luna.html');
  });

  it.each(htmlFiles)('extracts a complete payload from %s', (filename) => {
    const html = loadHtmlFixture(filename);
    const payload = extractProfileDataFromHtml(html);

    expect(payload).not.toBeNull();
    expect(typeof payload?.id).toBe('number');
    expect(typeof payload?.nickname).toBe('string');
    expect(payload?.nickname.length).toBeGreaterThan(0);
    expect(Array.isArray(payload?.photos)).toBe(true);
    expect(payload?.badges).toBeDefined();
    expect(payload?.personalDetails).toBeDefined();
    expect(payload?.baseCity).toBeDefined();
    expect(payload?.pageSchema?.['@graph']).toBeDefined();
  });
});
