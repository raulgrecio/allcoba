import { describe, expect, it } from 'vitest';

import { parseNextData } from '../../../../../../../src/infrastructure/adapters/sources/_shared/tech/parse-next-data.js';

describe('parseNextData', () => {
  it('extracts __NEXT_DATA__ from Pages Router HTML', () => {
    const data = { props: { pageProps: { name: 'Ana' } }, page: '/perfil/[slug]' };
    const html = `<html><head>
      <script id="__NEXT_DATA__" type="application/json">${JSON.stringify(data)}</script>
    </head><body></body></html>`;
    expect(parseNextData(html)).toEqual(data);
  });

  it('returns null when script absent', () => {
    expect(parseNextData('<html><body>no next</body></html>')).toBeNull();
  });

  it('returns null on invalid JSON', () => {
    const html = '<script id="__NEXT_DATA__" type="application/json">{broken</script>';
    expect(parseNextData(html)).toBeNull();
  });

  it('returns null when value is an array (unexpected)', () => {
    const html = '<script id="__NEXT_DATA__" type="application/json">[1,2,3]</script>';
    expect(parseNextData(html)).toBeNull();
  });
});
