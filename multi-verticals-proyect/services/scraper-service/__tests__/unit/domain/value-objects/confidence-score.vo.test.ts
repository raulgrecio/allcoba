import { describe, expect, it } from 'vitest';

import { ConfidenceScore } from '#domain/value-objects/confidence-score.vo.js';

describe('ConfidenceScore', () => {
  describe('create', () => {
    it('accepts 0', () => {
      const result = ConfidenceScore.create(0);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe(0);
      }
    });

    it('accepts 1', () => {
      const result = ConfidenceScore.create(1);
      expect(result.success).toBe(true);
    });

    it('accepts 0.5', () => {
      const result = ConfidenceScore.create(0.5);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe(0.5);
      }
    });

    it('fails for value above 1', () => {
      const result = ConfidenceScore.create(1.1);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]!.code).toBe('CONFIDENCE_SCORE_INVALID');
        expect(result.errors[0]!.path).toContain('confidenceScore');
      }
    });

    it('fails for negative value', () => {
      const result = ConfidenceScore.create(-0.1);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]!.code).toBe('CONFIDENCE_SCORE_INVALID');
      }
    });

    it('fails for Infinity', () => {
      const result = ConfidenceScore.create(Infinity);
      expect(result.success).toBe(false);
    });

    it('fails for NaN', () => {
      const result = ConfidenceScore.create(NaN);
      expect(result.success).toBe(false);
    });
  });

  describe('static factories', () => {
    it('high() returns 0.95', () => {
      expect(ConfidenceScore.high().value).toBe(0.95);
    });

    it('medium() returns 0.8', () => {
      expect(ConfidenceScore.medium().value).toBe(0.8);
    });

    it('low() returns 0.5', () => {
      expect(ConfidenceScore.low().value).toBe(0.5);
    });
  });

  describe('isHighConfidence / isMediumConfidence', () => {
    it('0.95 is high confidence', () => {
      expect(ConfidenceScore.high().isHighConfidence()).toBe(true);
      expect(ConfidenceScore.high().isMediumConfidence()).toBe(false);
    });

    it('0.8 is medium confidence', () => {
      expect(ConfidenceScore.medium().isMediumConfidence()).toBe(true);
      expect(ConfidenceScore.medium().isHighConfidence()).toBe(false);
    });

    it('0.5 is neither high nor medium', () => {
      expect(ConfidenceScore.low().isHighConfidence()).toBe(false);
      expect(ConfidenceScore.low().isMediumConfidence()).toBe(false);
    });

    it('exact 0.9 is high confidence', () => {
      const score = ConfidenceScore.create(0.9);
      expect(score.success && score.value.isHighConfidence()).toBe(true);
    });

    it('exact 0.7 is medium confidence', () => {
      const score = ConfidenceScore.create(0.7);
      expect(score.success && score.value.isMediumConfidence()).toBe(true);
    });
  });

  describe('equals', () => {
    it('equal for same value', () => {
      const a = ConfidenceScore.create(0.8);
      const b = ConfidenceScore.create(0.8);
      expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    });

    it('not equal for different values', () => {
      const a = ConfidenceScore.create(0.8);
      const b = ConfidenceScore.create(0.9);
      expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
    });
  });

  describe('toString / toJSON', () => {
    it('toString returns numeric string', () => {
      expect(ConfidenceScore.high().toString()).toBe('0.95');
    });

    it('toJSON returns number', () => {
      expect(ConfidenceScore.medium().toJSON()).toBe(0.8);
    });
  });
});
