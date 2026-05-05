import type { ValidationResult } from '../shared/validation-result.js';
import { failOne, ok } from '../shared/validation-result.js';
import { ValueObject } from './value-object.base.js';

const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export class Url extends ValueObject {
  private constructor(
    public readonly value: string,
    public readonly origin: string,
    public readonly pathname: string,
  ) {
    super();
  }

  static create(raw: string): ValidationResult<Url> {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      return failOne('URL_INVALID_FORMAT', 'Invalid URL format', ['url']);
    }

    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return failOne('URL_PROTOCOL_NOT_ALLOWED', 'URL must use http or https', ['url']);
    }

    return ok(new Url(parsed.href, parsed.origin, parsed.pathname));
  }

  equals(other: ValueObject): boolean {
    return other instanceof Url && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
