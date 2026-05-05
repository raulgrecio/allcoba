import { z } from 'zod';

import type { ValidationResult } from '@allcoba/domain';
import { failOne, ok, ValueObject } from '@allcoba/domain';

const scoreSchema = z.number().finite().min(0).max(1);

export class ConfidenceScore extends ValueObject {
  private constructor(public readonly value: number) {
    super();
  }

  static create(raw: number): ValidationResult<ConfidenceScore> {
    const parsed = scoreSchema.safeParse(raw);
    if (!parsed.success) {
      return failOne(
        'CONFIDENCE_SCORE_INVALID',
        'Confidence score must be a finite number between 0 and 1',
        ['confidenceScore'],
      );
    }
    return ok(new ConfidenceScore(parsed.data));
  }

  static high(): ConfidenceScore {
    return new ConfidenceScore(0.95);
  }

  static medium(): ConfidenceScore {
    return new ConfidenceScore(0.8);
  }

  static low(): ConfidenceScore {
    return new ConfidenceScore(0.5);
  }

  isHighConfidence(): boolean {
    return this.value >= 0.9;
  }

  isMediumConfidence(): boolean {
    return this.value >= 0.7 && this.value < 0.9;
  }

  equals(other: ValueObject): boolean {
    return other instanceof ConfidenceScore && this.value === other.value;
  }

  toString(): string {
    return this.value.toString();
  }

  toJSON(): number {
    return this.value;
  }
}
