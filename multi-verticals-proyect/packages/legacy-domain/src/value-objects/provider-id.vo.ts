import { z } from 'zod';

import type { ValidationResult } from '../shared/validation-result.js';
import { failOne, ok } from '../shared/validation-result.js';
import { Id } from './id.vo.js';

const uuidSchema = z.string().uuid();

export class ProviderId extends Id {
  private constructor(value: string) {
    super(value);
  }

  /**
   * Creates a ProviderId from raw data.
   * @param candidate - The provider id (string, UUID)
   */
  static create(candidate: unknown): ValidationResult<ProviderId> {
    const parsed = uuidSchema.safeParse(candidate);
    if (!parsed.success) {
      return failOne('PROVIDER_ID_INVALID', 'Invalid ProviderId: must be a UUID', ['providerId']);
    }
    return ok(new ProviderId(parsed.data));
  }

  static generate(): ProviderId {
    return new ProviderId(crypto.randomUUID());
  }
}
