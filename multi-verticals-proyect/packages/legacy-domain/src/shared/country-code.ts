export type CountryCode = 'ES';

export const SUPPORTED_COUNTRIES: readonly CountryCode[] = ['ES'] as const;

export function isSupportedCountry(code: string): code is CountryCode {
  return (SUPPORTED_COUNTRIES as readonly string[]).includes(code);
}
