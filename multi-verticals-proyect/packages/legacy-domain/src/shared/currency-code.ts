export type CurrencyCode = 'EUR';

export const SUPPORTED_CURRENCIES: readonly CurrencyCode[] = ['EUR'] as const;

export function isSupportedCurrency(code: string): code is CurrencyCode {
  return (SUPPORTED_CURRENCIES as readonly string[]).includes(code);
}
