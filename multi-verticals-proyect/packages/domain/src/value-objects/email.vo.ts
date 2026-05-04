import { z } from 'zod';

import type { ValidationResult } from '../shared/validation-result.js';
import { failOne, ok } from '../shared/validation-result.js';
import { ValueObject } from './value-object.base.js';

const emailSchema = z.string().email().max(254);

export class Email extends ValueObject {
  private constructor(public readonly value: string) {
    super();
  }

  static create(candidate: string): ValidationResult<Email> {
    const result = emailSchema.safeParse(candidate);
    if (!result.success) {
      return failOne('EMAIL_INVALID', result.error.issues[0]!.message, ['email']);
    }
    return ok(new Email(result.data));
  }

  equals(other: ValueObject): boolean {
    return other instanceof Email && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
