import type { ValidationResult } from '../shared/validation-result.js';
import { failOne, ok } from '../shared/validation-result.js';
import { ValueObject } from './value-object.base.js';

const TELEGRAM_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9_]{3,30}[a-zA-Z0-9]$/;

export class Telegram extends ValueObject {
  private constructor(public readonly handle: string) {
    super();
  }

  static create(raw: string): ValidationResult<Telegram> {
    const stripped = raw.startsWith('@') ? raw.slice(1) : raw;

    if (!TELEGRAM_REGEX.test(stripped)) {
      return failOne(
        'TELEGRAM_INVALID_FORMAT',
        'Telegram handle must be 5-32 chars, alphanumeric/underscore, start and end with alphanumeric',
        ['telegram'],
      );
    }

    return ok(new Telegram(stripped));
  }

  get display(): string {
    return `@${this.handle}`;
  }

  equals(other: ValueObject): boolean {
    return other instanceof Telegram && this.handle.toLowerCase() === other.handle.toLowerCase();
  }

  toString(): string {
    return this.display;
  }

  toJSON(): string {
    return this.handle;
  }
}
