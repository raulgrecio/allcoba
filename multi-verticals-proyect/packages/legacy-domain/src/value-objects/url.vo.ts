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

  /**
   * Creates a Url from raw data.
   * @param candidate - The url (string)
   */
  static create(candidate: unknown): ValidationResult<Url> {
    if (typeof candidate !== 'string' || !candidate) {
      return failOne('URL_REQUIRED', 'URL is required and must be a string', ['url']);
    }

    let parsed: URL;
    try {
      parsed = new URL(candidate);
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
