import { describe, expect, it, vi } from 'vitest';
import * as cheerio from 'cheerio';

import { TopEscortBabesAdapter } from '#infrastructure/adapters/sources/dating/topescortbabes.adapter.js';

describe('Unit: TopEscortBabesAdapter', () => {
  const mockCrawler: any = {
    fetch: vi.fn(),
  };
  const adapter = new TopEscortBabesAdapter(mockCrawler);

  it('canHandle topescortbabes.com URLs', () => {
    expect(
      adapter.canHandle('https://www.topescortbabes.com/es/spain/escorts/madrid/elena/123'),
    ).toBe(true);
  });

  it('identifies profile URLs correctly', () => {
    // Real profile slug ends with _{numericId}
    expect(
      adapter.isProfileUrl('https://topescortbabes.com/es/madrid/escorts/Scarlett-Rous_2817245'),
    ).toBe(true);
    expect(
      adapter.isProfileUrl('https://topescortbabes.com/es/madrid/escorts/Mara-_3585366'),
    ).toBe(true);
    // Filter/facet pages — not profiles
    expect(adapter.isProfileUrl('https://topescortbabes.com/es/madrid/escorts/latina-ethnic')).toBe(false);
    expect(adapter.isProfileUrl('https://topescortbabes.com/es/madrid/escorts/black-hair')).toBe(false);
    expect(adapter.isProfileUrl('https://topescortbabes.com/es/madrid/escorts/college_girl-age')).toBe(false);
    // City listing (nothing after escorts)
    expect(adapter.isProfileUrl('https://topescortbabes.com/es/madrid/escorts')).toBe(false);
  });

  it('extracts ID correctly', () => {
    expect(
      adapter['extractId'](
        'https://www.topescortbabes.com/es/spain/escorts/madrid/elena/123',
        cheerio.load(''),
      ),
    ).toBe('123');
  });

  it('extracts attributes from profileData script', () => {
    const profileData = {
      nickname: 'Elena',
      age: '25',
      gender: 'female',
      personalDetails: {
        height: '170 cm',
        weight: '60 kg',
        hair: 'Blond',
        eyes: 'Blue',
        ethnic: 'Caucasian',
        nationality: 'Spanish',
        orientation: 'Hetero',
        bust: '90',
        waist: '60',
        hip: '90',
      },
      badges: { verified: true },
      prices: [{ label: '1h', price_incall: '100' }],
      aboutMe: { content: 'About me from JSON' },
    };
    // El adaptador espera que el script termine en ; y algo como < o window
    const html = `<html><body><script>window.profileData = ${JSON.stringify(profileData)};</script></body></html>`;
    const $ = cheerio.load(html);
    const attrs = adapter['extractAttributes']($, 'https://example.com/123');

    expect(attrs.nickname).toBe('Elena');
    expect(attrs.age).toBe(25);
    expect(attrs.gender).toBe('Mujer');
    expect(attrs.heightCm).toBe(170);
    expect(attrs.verified).toBe(true);
    expect(attrs.measurements).toBe('90-60-90');
  });

  it('handles male gender correctly', () => {
    const profileData = { gender: 'male' };
    const html = `<html><body><script>window.profileData = ${JSON.stringify(profileData)};</script></body></html>`;
    const $ = cheerio.load(html);
    const attrs = adapter['extractAttributes']($, 'url');
    expect(attrs.gender).toBe('Hombre');
  });

  it('handles malformed JSON in script tag', () => {
    const html =
      '<html><body><script>window.profileData = { invalid json };</script></body></html>';
    const $ = cheerio.load(html);
    expect(adapter['getProfileData']($)).toBeNull();
  });

  it('extracts next page URL', () => {
    const html =
      '<html><body><a rel="next" href="https://topescortbabes.com/es/spain/escorts?page=2">Next</a></body></html>';
    const nextUrl = adapter.extractNextPageUrl(html, 'url');
    expect(nextUrl).toBe('https://topescortbabes.com/es/spain/escorts?page=2');
  });

  it('handles missing profileData gracefully', () => {
    const $ = cheerio.load(
      '<div><h1>DOM Title</h1><p class="profile-description">DOM Description</p></div>',
    );
    const attrs = adapter['extractAttributes']($, 'https://example.com/123');
    expect(attrs.independent).toBe(true);
    expect(adapter['extractDescription']($)).toBe('DOM Description');
  });

  it('extracts contacts from profileData', async () => {
    const profileData = {
      encodedTelegram: 'some_encoded_data',
      phoneNumber: '123456789',
    };
    const html = `<html><body><script>window.profileData = ${JSON.stringify(profileData)};</script></body></html>`;
    const $ = cheerio.load(html);

    const contacts = adapter['extractContacts']($, {});
    // decodeContactInfo currently returns undefined, so contacts should be empty
    expect(contacts).toEqual([]);

    // Test extractPhones with plain phoneNumber
    const phones = await adapter['extractPhones']($, 'url');
    expect(phones).toEqual(['123456789']);
  });

  it('handles encodedPhoneNumber in extractPhones', async () => {
    const profileData = {
      encodedPhoneNumber: 'some_encoded_phone',
    };
    const html = `<html><body><script>window.profileData = ${JSON.stringify(profileData)};</script></body></html>`;
    const $ = cheerio.load(html);

    const phones = await adapter['extractPhones']($, 'url');
    // decodeContactInfo currently returns undefined, so it should return []
    expect(phones).toEqual([]);
  });

  it('decodeContactInfo returns undefined (pending implementation)', () => {
    expect(adapter['decodeContactInfo']('anything')).toBeUndefined();
  });
});
