/**
 * Price — canonical money value.
 *
 * Always stored as integer amount in the smallest currency unit
 * (cents) is the safest representation, but for scraped data we accept
 * decimal numbers because precision is bounded by the source. Code that
 * does math should convert to a money library at use-case level.
 */

import type { CurrencyCode, PriceLabelType, PriceSlot } from '../primitives/enums.js';

export interface Money {
  readonly amount: number;
  readonly currency: CurrencyCode;
}

/** A single priced offering. */
export interface PriceCanonical {
  readonly slot: PriceSlot;
  readonly amount: number;
  readonly currency: CurrencyCode;
}

export const moneyEquals = (a: Money, b: Money): boolean =>
  a.amount === b.amount && a.currency === b.currency;

export const priceEquals = (a: PriceCanonical, b: PriceCanonical): boolean =>
  a.slot === b.slot && a.amount === b.amount && a.currency === b.currency;

/**
 * Return the cheapest price across slots — used to derive `minimumPrice`
 * displays. Returns null when no prices share a currency.
 */
export const minimumPrice = (prices: readonly PriceCanonical[]): PriceCanonical | null => {
  if (prices.length === 0) return null;
  const sorted = [...prices].sort((a, b) => a.amount - b.amount);
  return sorted[0] ?? null;
};

export type { PriceLabelType };
