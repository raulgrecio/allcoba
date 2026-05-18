import { describe, expect, it } from 'vitest';

import {
  normalizeEGEGender,
  parseEGEAmount,
  parseEGEAvailableFor,
  parseEGEDate,
  parseEGEHeightCm,
  parseEGELanguages,
  parseEGEMeetingWith,
  parseEGEWeightKg,
  parseDurationSlot,
  slugify,
} from '#infrastructure/adapters/sources/dating/eurogirlsescort/eurogirlsescort.parsers.js';

// ============================================================================
// parseEGEDate
// ============================================================================
describe('parseEGEDate', () => {
  it('parses DD.M.YYYY', () => {
    expect(parseEGEDate('28.4.2026')).toBe('2026-04-28T00:00:00.000Z');
  });

  it('parses DD.MM.YYYY', () => {
    expect(parseEGEDate('01.12.2025')).toBe('2025-12-01T00:00:00.000Z');
  });

  it('returns undefined for invalid input', () => {
    expect(parseEGEDate(undefined)).toBeUndefined();
    expect(parseEGEDate('')).toBeUndefined();
    expect(parseEGEDate('not-a-date')).toBeUndefined();
  });
});

// ============================================================================
// parseEGEHeightCm / parseEGEWeightKg
// ============================================================================
describe('parseEGEHeightCm', () => {
  it('extracts cm from "162 cm / 5\'4\'\'"', () => {
    expect(parseEGEHeightCm("162 cm / 5'4''")).toBe(162);
  });

  it('accepts bare number', () => {
    expect(parseEGEHeightCm('175')).toBe(175);
  });

  it('returns undefined for null', () => {
    expect(parseEGEHeightCm(null)).toBeUndefined();
    expect(parseEGEHeightCm(undefined)).toBeUndefined();
  });
});

describe('parseEGEWeightKg', () => {
  it('extracts kg from "55 kg / 121 lbs"', () => {
    expect(parseEGEWeightKg('55 kg / 121 lbs')).toBe(55);
  });

  it('accepts bare number', () => {
    expect(parseEGEWeightKg('60')).toBe(60);
  });

  it('returns undefined for null', () => {
    expect(parseEGEWeightKg(null)).toBeUndefined();
  });
});

// ============================================================================
// slugify
// ============================================================================
describe('slugify', () => {
  it('lowercases and kebab-cases', () => {
    expect(slugify('Russian')).toBe('russian');
    expect(slugify('Caucasian (white)')).toBe('caucasian-white');
    expect(slugify('Medium long')).toBe('medium-long');
  });

  it('handles undefined/empty', () => {
    expect(slugify(undefined)).toBeUndefined();
    expect(slugify('')).toBeUndefined();
  });

  it('strips leading/trailing hyphens', () => {
    expect(slugify('  Blonde  ')).toBe('blonde');
  });
});

// ============================================================================
// normalizeEGEGender
// ============================================================================
describe('normalizeEGEGender', () => {
  it('maps Female → female', () => {
    expect(normalizeEGEGender('Female')).toBe('female');
  });

  it('maps Male → male', () => {
    expect(normalizeEGEGender('Male')).toBe('male');
  });

  it('maps Trans → trans', () => {
    expect(normalizeEGEGender('Trans')).toBe('trans');
    expect(normalizeEGEGender('Shemale')).toBe('trans');
  });

  it('maps unknown → other', () => {
    expect(normalizeEGEGender('Unknown')).toBe('other');
  });

  it('returns undefined for null', () => {
    expect(normalizeEGEGender(null)).toBeUndefined();
  });
});

// ============================================================================
// parseEGEAvailableFor
// ============================================================================
describe('parseEGEAvailableFor', () => {
  it('"Outcall + Incall" → both true', () => {
    expect(parseEGEAvailableFor('Outcall + Incall')).toEqual({ incall: true, outcall: true });
  });

  it('"Incall" → incall only', () => {
    expect(parseEGEAvailableFor('Incall')).toEqual({ incall: true, outcall: false });
  });

  it('"Outcall" → outcall only', () => {
    expect(parseEGEAvailableFor('Outcall')).toEqual({ incall: false, outcall: true });
  });

  it('null → both false', () => {
    expect(parseEGEAvailableFor(null)).toEqual({ incall: false, outcall: false });
  });
});

// ============================================================================
// parseEGEMeetingWith
// ============================================================================
describe('parseEGEMeetingWith', () => {
  it('"Man" → ["man"]', () => {
    expect(parseEGEMeetingWith('Man')).toEqual(['man']);
  });

  it('"Couples" → ["couple"]', () => {
    expect(parseEGEMeetingWith('Couples')).toEqual(['couple']);
  });

  it('"Man, Woman" → ["man", "woman"]', () => {
    const result = parseEGEMeetingWith('Man, Woman');
    expect(result).toContain('man');
    expect(result).toContain('woman');
  });

  it('null → []', () => {
    expect(parseEGEMeetingWith(null)).toEqual([]);
  });
});

// ============================================================================
// parseDurationSlot
// ============================================================================
describe('parseDurationSlot', () => {
  it.each([
    ['0.5 Hour', 'custom'],
    ['1 Hour', 'h1'],
    ['2 Hours', 'h2'],
    ['3 Hours', 'h3'],
    ['6 Hours', 'custom'],
    ['12 Hours', 'h12'],
    ['24 Hours', 'h24'],
    ['48 Hours', 'overnight'],
    ['Another 24h', 'custom'],
  ])('"%s" → "%s"', (input, expected) => {
    expect(parseDurationSlot(input)).toBe(expected);
  });
});

// ============================================================================
// parseEGEAmount
// ============================================================================
describe('parseEGEAmount', () => {
  it('parses "600 MYR"', () => {
    expect(parseEGEAmount('600 MYR')).toEqual({ amount: 600, currency: 'MYR' });
  });

  it('parses "130 EUR"', () => {
    expect(parseEGEAmount('130 EUR')).toEqual({ amount: 130, currency: 'EUR' });
  });

  it('handles nbsp as space', () => {
    expect(parseEGEAmount('600 MYR')).toEqual({ amount: 600, currency: 'MYR' });
  });

  it('returns undefined for empty', () => {
    expect(parseEGEAmount('')).toBeUndefined();
    expect(parseEGEAmount(null)).toBeUndefined();
  });
});

// ============================================================================
// parseEGELanguages
// ============================================================================
describe('parseEGELanguages', () => {
  it('splits comma-separated', () => {
    expect(parseEGELanguages('English, Russian')).toEqual(['English', 'Russian']);
  });

  it('splits slash-separated', () => {
    expect(parseEGELanguages('English/Spanish')).toEqual(['English', 'Spanish']);
  });

  it('trims whitespace', () => {
    expect(parseEGELanguages(' English ')).toEqual(['English']);
  });

  it('returns [] for null', () => {
    expect(parseEGELanguages(null)).toEqual([]);
  });
});
