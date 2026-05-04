import { z } from 'zod';

import type { ValidationResult } from '../shared/validation-result.js';
import { failOne, ok } from '../shared/validation-result.js';
import { ValueObject } from './value-object.base.js';

const schema = z.string().trim().min(3).max(200);

export class Street extends ValueObject {
  private constructor(public readonly value: string) {
    super();
  }

  static create(raw: string): ValidationResult<Street> {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return failOne('STREET_INVALID', 'Street must be 3-200 chars', ['street']);
    }
    return ok(new Street(parsed.data));
  }

  equals(other: ValueObject): boolean {
    return other instanceof Street && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
