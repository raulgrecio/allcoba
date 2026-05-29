import { describe, expect, it } from 'vitest';

import {
  parseCityFromBreadcrumb,
  parseEscortAdvisorPhone,
  parseFirstInt,
  parseSourceIdFromUrl,
} from '#infrastructure/adapters/sources/dating/escort-advisor/escort-advisor.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it.each([
    ['https://www.escort-advisor.xxx/escorts/spain/madrid/diana-667554247/', '667554247'],
    ['https://www.escort-advisor.xxx/escorts/spain/madrid/diana/', 'diana'],
  ])('%s → %s', (url, expected) => {
    expect(parseSourceIdFromUrl(url)).toBe(expected);
  });
});

describe('parseEscortAdvisorPhone', () => {
  it.each([
    ['tel:+34655447788', '655447788'],
    ['tel:655447788', '655447788'],
    [undefined, undefined],
    ['tel:123', undefined],
  ])('%s → %s', (href, expected) => {
    expect(parseEscortAdvisorPhone(href)).toBe(expected);
  });
});

describe('parseFirstInt', () => {
  it.each([
    ['29', 29],
    ['170 cm', 170],
    ['57 kg', 57],
    [undefined, undefined],
    ['', undefined],
  ])('%s → %s', (text, expected) => {
    expect(parseFirstInt(text)).toBe(expected);
  });
});

describe('parseCityFromBreadcrumb', () => {
  it('returns 3rd item', () => {
    expect(parseCityFromBreadcrumb(['Home', 'España', 'Madrid', 'Diana'])).toBe('Madrid');
  });
  it('returns undefined when fewer items', () => {
    expect(parseCityFromBreadcrumb(['Home', 'España'])).toBeUndefined();
  });
});
