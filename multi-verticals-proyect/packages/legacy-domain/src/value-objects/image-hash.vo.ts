import type { ValidationResult } from '../shared/validation-result.js';
import { failOne, ok } from '../shared/validation-result.js';
import { ValueObject } from './value-object.base.js';

// pHash: 64-bit perceptual hash represented as 16 lowercase hex chars
const PHASH_REGEX = /^[0-9a-f]{16}$/;

export class ImageHash extends ValueObject {
  private constructor(public readonly value: string) {
    super();
  }

  static create(raw: unknown): ValidationResult<ImageHash> {
    if (typeof raw !== 'string' || !raw) {
      return failOne('IMAGE_HASH_REQUIRED', 'Image hash is required and must be a string', ['imageHash']);
    }

    const normalized = raw.toLowerCase().trim();
    if (!PHASH_REGEX.test(normalized)) {
      return failOne(
        'IMAGE_HASH_INVALID',
        'Image hash must be 16 lowercase hex characters (64-bit pHash)',
        ['imageHash'],
      );
    }
    return ok(new ImageHash(normalized));
  }

  equals(other: ValueObject): boolean {
    return other instanceof ImageHash && this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  toJSON(): string {
    return this.value;
  }
}
