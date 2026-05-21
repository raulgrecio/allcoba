import { describe, expect, it } from 'vitest';

import {
  wpRestLinks,
  wpRestList,
} from '../../../../../../../src/infrastructure/adapters/sources/_shared/tech/wp-rest-list.js';

const ITEMS = [
  { id: 1, link: 'https://chicasmalas.es/anuncios/ana/', title: { rendered: 'Ana' } },
  { id: 2, link: 'https://chicasmalas.es/anuncios/sofia/', title: { rendered: 'Sofia' } },
];

describe('wpRestList', () => {
  it('parses JSON array from <pre> (Chrome rendering)', () => {
    const html = `<html><body><pre>${JSON.stringify(ITEMS)}</pre></body></html>`;
    expect(wpRestList(html)).toEqual(ITEMS);
  });

  it('parses raw JSON body (no <pre>)', () => {
    const html = JSON.stringify(ITEMS);
    expect(wpRestList(html)).toEqual(ITEMS);
  });

  it('returns [] on invalid JSON', () => {
    expect(wpRestList('<html><body>not json</body></html>')).toEqual([]);
  });

  it('returns [] when root is object not array', () => {
    const html = `<pre>${JSON.stringify({ message: 'rest_no_route' })}</pre>`;
    expect(wpRestList(html)).toEqual([]);
  });
});

describe('wpRestLinks', () => {
  it('extracts link fields', () => {
    const html = `<pre>${JSON.stringify(ITEMS)}</pre>`;
    expect(wpRestLinks(html)).toEqual([
      'https://chicasmalas.es/anuncios/ana/',
      'https://chicasmalas.es/anuncios/sofia/',
    ]);
  });

  it('skips items without link', () => {
    const items = [{ id: 1 }, { id: 2, link: 'https://chicasmalas.es/anuncios/ana/' }];
    const html = `<pre>${JSON.stringify(items)}</pre>`;
    expect(wpRestLinks(html)).toEqual(['https://chicasmalas.es/anuncios/ana/']);
  });

  it('returns [] on parse error', () => {
    expect(wpRestLinks('bad html')).toEqual([]);
  });
});
