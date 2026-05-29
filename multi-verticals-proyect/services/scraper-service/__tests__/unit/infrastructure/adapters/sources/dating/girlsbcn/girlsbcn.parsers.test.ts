import { describe, expect, it } from 'vitest';

import {
  extractWhatsappPhone,
  normalizeGBCNPhone,
  parseGBCNAge,
  parseGBCNHeightCm,
  parseGBCNMeasurements,
  parseGBCNMeetingPlaces,
  parseGBCNWeightKg,
  slugifyGBCN,
} from '#infrastructure/adapters/sources/dating/girlsbcn/girlsbcn.parsers.js';

describe('parseGBCNHeightCm', () => {
  it('parses "160 cm."', () => expect(parseGBCNHeightCm('160 cm.')).toBe(160));
  it('parses "172 cm."', () => expect(parseGBCNHeightCm('172 cm.')).toBe(172));
  it('parses bare "165"', () => expect(parseGBCNHeightCm('165')).toBe(165));
  it('returns undefined for null', () => expect(parseGBCNHeightCm(null)).toBeUndefined());
  it('returns undefined for empty string', () => expect(parseGBCNHeightCm('')).toBeUndefined());
  it('returns undefined for text-only', () => expect(parseGBCNHeightCm('alta')).toBeUndefined());
});

describe('parseGBCNWeightKg', () => {
  it('parses "55 Kg."', () => expect(parseGBCNWeightKg('55 Kg.')).toBe(55));
  it('parses "58 Kg."', () => expect(parseGBCNWeightKg('58 Kg.')).toBe(58));
  it('parses lowercase "55 kg"', () => expect(parseGBCNWeightKg('55 kg')).toBe(55));
  it('parses bare "60"', () => expect(parseGBCNWeightKg('60')).toBe(60));
  it('returns undefined for null', () => expect(parseGBCNWeightKg(null)).toBeUndefined());
  it('returns undefined for empty', () => expect(parseGBCNWeightKg('')).toBeUndefined());
});

describe('parseGBCNAge', () => {
  it('parses "25 años"', () => expect(parseGBCNAge('25 años')).toBe(25));
  it('parses "22 años"', () => expect(parseGBCNAge('22 años')).toBe(22));
  it('parses bare "30"', () => expect(parseGBCNAge('30')).toBe(30));
  it('returns undefined for null', () => expect(parseGBCNAge(null)).toBeUndefined());
  it('returns undefined for empty', () => expect(parseGBCNAge('')).toBeUndefined());
});

describe('parseGBCNMeasurements', () => {
  it('parses "80 - 60 - 95"', () => {
    expect(parseGBCNMeasurements('80 - 60 - 95')).toEqual({ bustCm: 80, waistCm: 60, hipCm: 95 });
  });

  it('parses "85 - 60 - 95"', () => {
    expect(parseGBCNMeasurements('85 - 60 - 95')).toEqual({ bustCm: 85, waistCm: 60, hipCm: 95 });
  });

  it('handles en-dash separator', () => {
    expect(parseGBCNMeasurements('90–65–100')).toEqual({ bustCm: 90, waistCm: 65, hipCm: 100 });
  });

  it('returns {} for null', () => expect(parseGBCNMeasurements(null)).toEqual({}));
  it('returns {} for incomplete', () => expect(parseGBCNMeasurements('80 - 60')).toEqual({}));
  it('returns {} for non-numeric', () => expect(parseGBCNMeasurements('a - b - c')).toEqual({}));
});

describe('slugifyGBCN', () => {
  it('lowercases', () => expect(slugifyGBCN('Negro')).toBe('negro'));
  it('strips accents', () => expect(slugifyGBCN('Española')).toBe('espanola'));
  it('replaces spaces with hyphens', () =>
    expect(slugifyGBCN('Ojos marrones')).toBe('ojos-marrones'));
  it('strips leading/trailing hyphens', () => expect(slugifyGBCN(' rojo ')).toBe('rojo'));
  it('returns undefined for null', () => expect(slugifyGBCN(null)).toBeUndefined());
  it('returns undefined for empty', () => expect(slugifyGBCN('')).toBeUndefined());
  it('handles Colombiana', () => expect(slugifyGBCN('Colombiana')).toBe('colombiana'));
  it('handles Full time', () => expect(slugifyGBCN('Full time')).toBe('full-time'));
});

describe('normalizeGBCNPhone', () => {
  it('strips dashes', () => expect(normalizeGBCNPhone('663-475-960')).toBe('663475960'));
  it('strips spaces', () => expect(normalizeGBCNPhone('663 475 960')).toBe('663475960'));
  it('leaves digits untouched', () => expect(normalizeGBCNPhone('663475960')).toBe('663475960'));
  it('returns undefined for null', () => expect(normalizeGBCNPhone(null)).toBeUndefined());
  it('returns undefined for empty', () => expect(normalizeGBCNPhone('')).toBeUndefined());
});

describe('extractWhatsappPhone', () => {
  it('extracts E.164 from wa.me href', () => {
    expect(extractWhatsappPhone('https://wa.me/34663475960?text=Hola')).toBe('+34663475960');
  });

  it('handles href without query string', () => {
    expect(extractWhatsappPhone('https://wa.me/34641351077')).toBe('+34641351077');
  });

  it('returns undefined for non-wa.me href', () => {
    expect(extractWhatsappPhone('https://example.com')).toBeUndefined();
  });

  it('returns undefined for null', () => expect(extractWhatsappPhone(null)).toBeUndefined());
});

describe('parseGBCNMeetingPlaces', () => {
  it('detects incall from "apartamento"', () => {
    expect(parseGBCNMeetingPlaces('en mi apartamento')).toEqual({ incall: true, outcall: false });
  });

  it('detects incall from "mi casa"', () => {
    expect(parseGBCNMeetingPlaces('ven a mi casa')).toEqual({ incall: true, outcall: false });
  });

  it('detects outcall from "tu casa"', () => {
    expect(parseGBCNMeetingPlaces('voy a tu casa')).toEqual({ incall: false, outcall: true });
  });

  it('detects outcall from "hotel"', () => {
    expect(parseGBCNMeetingPlaces('hoteles disponibles')).toEqual({ incall: false, outcall: true });
  });

  it('detects both', () => {
    expect(parseGBCNMeetingPlaces('apartamento o tu casa')).toEqual({
      incall: true,
      outcall: true,
    });
  });

  it('detects outcall from meetingTags', () => {
    expect(parseGBCNMeetingPlaces(undefined, ['En tu casa', 'Hoteles'])).toEqual({
      incall: false,
      outcall: true,
    });
  });

  it('returns false/false for empty', () => {
    expect(parseGBCNMeetingPlaces(undefined)).toEqual({ incall: false, outcall: false });
  });
});
