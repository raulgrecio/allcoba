import { z } from 'zod';

import type { CurrencyCode } from '../shared/currency-code.js';
import type { ValidationResult } from '../shared/validation-result.js';
import { isSupportedCurrency } from '../shared/currency-code.js';
import { failOne, ok } from '../shared/validation-result.js';
import { ValueObject } from './value-object.base.js';

const amountSchema = z.number().finite().nonnegative();

export class Price extends ValueObject {
  private constructor(
    public readonly amount: number,
    public readonly currency: CurrencyCode,
  ) {
    super();
  }

  /**
   * Creates a Price from raw data.
   * @param candidate - The price amount (number, 0-infinity)
   * @param currency - The currency code (2 chars)
   */
  static create(candidate: unknown, currency: unknown): ValidationResult<Price> {
    if (typeof candidate !== 'number' || typeof currency !== 'string' || !currency) {
      return failOne('PRICE_REQUIRED', 'Price amount (number) and currency (string) are required', [
        'price',
      ]);
    }

    const parsedAmount = amountSchema.safeParse(candidate);
    if (!parsedAmount.success) {
      return failOne('PRICE_AMOUNT_INVALID', 'Price amount must be a non-negative finite number', [
        'amount',
      ]);
    }

    if (!isSupportedCurrency(currency)) {
      return failOne('PRICE_CURRENCY_UNSUPPORTED', `Currency '${currency}' is not supported`, [
        'currency',
      ]);
    }

    return ok(new Price(parsedAmount.data, currency));
  }

  equals(other: ValueObject): boolean {
    return (
      other instanceof Price && this.amount === other.amount && this.currency === other.currency
    );
  }

  toString(): string {
    return `${this.amount} ${this.currency}`;
  }

  toJSON(): { amount: number; currency: CurrencyCode } {
    return { amount: this.amount, currency: this.currency };
  }
}
