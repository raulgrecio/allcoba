import { describe, expect, it } from 'vitest';

import {
  parseCondition,
  parseShipping,
  parseSourceIdFromUrl,
} from '#infrastructure/adapters/sources/general/wallapop/wallapop.parsers.js';

describe('parseSourceIdFromUrl', () => {
  it('extracts numeric id from /item/{slug}-{id}', () =>
    expect(parseSourceIdFromUrl('https://wallapop.com/item/cortacesped-honda-1263612321')).toBe(
      '1263612321',
    ));
  it('returns slug when no numeric id', () =>
    expect(parseSourceIdFromUrl('https://wallapop.com/item/some-slug')).toBe('some-slug'));
});

describe('parseCondition', () => {
  it('new → new', () => expect(parseCondition('new')).toBe('new'));
  it('as_good_as_new → as-new', () => expect(parseCondition('as_good_as_new')).toBe('as-new'));
  it('in_good_condition → good', () => expect(parseCondition('in_good_condition')).toBe('good'));
  it('has_given_it_all → fair', () => expect(parseCondition('has_given_it_all')).toBe('fair'));
  it('unacceptable → damaged', () => expect(parseCondition('unacceptable')).toBe('damaged'));
  it('unknown value → unknown', () => expect(parseCondition('xxx')).toBe('unknown'));
  it('undefined → undefined', () => expect(parseCondition(undefined)).toBeUndefined());
});

describe('parseShipping', () => {
  it('both true → allowed', () =>
    expect(parseShipping({ isItemShippable: true, isShippingAllowedByUser: true })).toBe(
      'allowed',
    ));
  it('shippable false → not-allowed', () =>
    expect(parseShipping({ isItemShippable: false, isShippingAllowedByUser: true })).toBe(
      'not-allowed',
    ));
  it('user not allowed → not-allowed', () =>
    expect(parseShipping({ isItemShippable: true, isShippingAllowedByUser: false })).toBe(
      'not-allowed',
    ));
  it('undefined → undefined', () => expect(parseShipping(undefined)).toBeUndefined());
});
