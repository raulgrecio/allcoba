import { z } from 'zod';

import type { ValidationResult } from '@allcoba/domain';
import { failOne, ok, ValueObject } from '@allcoba/domain';

const sourceSchema = z.string().trim().min(1).max(64);
const idSchema = z.string().trim().min(1).max(256);

export class ExternalId extends ValueObject {
  private constructor(
    public readonly source: string,
    public readonly id: string,
  ) {
    super();
  }

  static create(source: string, id: string): ValidationResult<ExternalId> {
    const parsedSource = sourceSchema.safeParse(source);
    if (!parsedSource.success) {
      return failOne('EXTERNAL_ID_SOURCE_INVALID', 'Source must be 1-64 chars', ['source']);
    }

    const parsedId = idSchema.safeParse(id);
    if (!parsedId.success) {
      return failOne('EXTERNAL_ID_INVALID', 'External id must be 1-256 chars', ['id']);
    }

    return ok(new ExternalId(parsedSource.data, parsedId.data));
  }

  get key(): string {
    return `${this.source}:${this.id}`;
  }

  equals(other: ValueObject): boolean {
    return other instanceof ExternalId && this.key === other.key;
  }

  toString(): string {
    return this.key;
  }

  toJSON() {
    return { source: this.source, id: this.id };
  }
}
