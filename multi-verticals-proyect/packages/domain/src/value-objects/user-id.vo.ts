import { z } from 'zod';

import type { ValidationResult } from '../shared/validation-result.js';
import { failOne, ok } from '../shared/validation-result.js';
import { Id } from './id.vo.js';

const uuidSchema = z.string().uuid();

export class UserId extends Id {
  private constructor(value: string) {
    super(value);
  }

  static create(raw: string): ValidationResult<UserId> {
    const parsed = uuidSchema.safeParse(raw);
    if (!parsed.success) {
      return failOne('USER_ID_INVALID', 'Invalid UserId: must be a UUID', ['userId']);
    }
    return ok(new UserId(parsed.data));
  }

  static generate(): UserId {
    return new UserId(crypto.randomUUID());
  }
}
