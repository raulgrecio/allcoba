export type CountryCode = 'ES' | 'PT';

export const SUPPORTED_COUNTRIES: readonly CountryCode[] = ['ES', 'PT'] as const;

export function isSupportedCountry(code: string): code is CountryCode {
  return (SUPPORTED_COUNTRIES as readonly string[]).includes(code);
}
