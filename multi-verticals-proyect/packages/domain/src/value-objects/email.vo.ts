import { z } from 'zod';
import { ValueObject } from './value-object.base.js';
import { ValidationError } from '../errors/base.errors.js';

const emailSchema = z.string().email().max(254);

export class Email extends ValueObject {
  private constructor(public readonly value: string) {
    super();
  }

  static create(candidate: string): Email {
    const result = emailSchema.safeParse(candidate);
    if (!result.success) {
      throw new ValidationError(result.error.issues[0]!.message, 'email');
    }
    return new Email(result.data);
  }

  equals(other: ValueObject): boolean {
    return other instanceof Email && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
