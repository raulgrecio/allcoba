import { describe, expect, it } from 'vitest';

import { Price } from '#value-objects/price.vo.js';

describe('Price', () => {
  describe('create', () => {
    it('accepts valid amount and EUR currency', () => {
      const result = Price.create(50, 'EUR');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.amount).toBe(50);
        expect(result.value.currency).toBe('EUR');
      }
    });

    it('accepts zero amount', () => {
      const result = Price.create(0, 'EUR');
      expect(result.success).toBe(true);
    });

    it('accepts decimal amount', () => {
      const result = Price.create(29.99, 'EUR');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.amount).toBe(29.99);
      }
    });

    it('fails for negative amount', () => {
      const result = Price.create(-1, 'EUR');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]!.code).toBe('PRICE_AMOUNT_INVALID');
        expect(result.errors[0]!.path).toContain('amount');
      }
    });

    it('fails for Infinity', () => {
      const result = Price.create(Infinity, 'EUR');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]!.code).toBe('PRICE_AMOUNT_INVALID');
      }
    });

    it('fails for NaN', () => {
      const result = Price.create(NaN, 'EUR');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]!.code).toBe('PRICE_AMOUNT_INVALID');
      }
    });

    it('fails for unsupported currency', () => {
      const result = Price.create(50, 'USD');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]!.code).toBe('PRICE_CURRENCY_UNSUPPORTED');
        expect(result.errors[0]!.path).toContain('currency');
      }
    });
  });

  describe('equals', () => {
    it('equal for same amount and currency', () => {
      const a = Price.create(100, 'EUR');
      const b = Price.create(100, 'EUR');
      expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    });

    it('not equal for different amounts', () => {
      const a = Price.create(100, 'EUR');
      const b = Price.create(200, 'EUR');
      expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
    });
  });

  describe('toString / toJSON', () => {
    it('toString returns amount + currency', () => {
      const result = Price.create(50, 'EUR');
      expect(result.success && result.value.toString()).toBe('50 EUR');
    });

    it('toJSON returns object with amount and currency', () => {
      const result = Price.create(29.99, 'EUR');
      expect(result.success && result.value.toJSON()).toEqual({ amount: 29.99, currency: 'EUR' });
    });
  });
});
