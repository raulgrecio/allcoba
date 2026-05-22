/**
 * Domain errors for the canonical scraper model.
 *
 * Replaces `failOne/ok` + `ValidationResult<T>` ceremony with a typed
 * `DomainError` hierarchy and a lightweight `Result<T, E>` discriminated
 * union. Validation at the boundary (adapter layer) parses raw input with
 * Zod; failures become `InvalidPayloadError`.
 */

import type { ZodIssue } from 'zod';

export abstract class DomainError extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Raw payload failed schema validation. */
export class InvalidPayloadError extends DomainError {
  readonly code = 'INVALID_PAYLOAD';
  constructor(
    readonly source: string,
    readonly issues: readonly ZodIssue[],
  ) {
    super(`Invalid payload from source "${source}": ${issues.length} issue(s)`);
  }
}

/** City/country/taxonomy slug could not be matched to a canonical catalog id. */
export class EntityNotResolvedError extends DomainError {
  readonly code = 'ENTITY_NOT_RESOLVED';
  constructor(
    readonly entityType: string,
    readonly slug: string,
  ) {
    super(`Could not resolve ${entityType} slug: "${slug}"`);
  }
}

/** Profile cannot be merged because identities don't match. */
export class MergeConflictError extends DomainError {
  readonly code = 'MERGE_CONFLICT';
  constructor(message: string) {
    super(message);
  }
}

/** Required canonical field missing or malformed after normalization. */
export class CanonicalFieldError extends DomainError {
  readonly code = 'CANONICAL_FIELD';
  constructor(
    readonly field: string,
    readonly reason: string,
  ) {
    super(`Canonical field "${field}" invalid: ${reason}`);
  }
}

/** Phone, email, URL or other branded primitive failed format check. */
export class FormatError extends DomainError {
  readonly code = 'FORMAT';
  constructor(
    readonly format: string,
    readonly raw: string,
  ) {
    super(`Invalid ${format} format: "${raw}"`);
  }
}

/**
 * Lightweight result type — replaces `ValidationResult<T>`.
 * Prefer this over throwing when the caller routinely handles the failure.
 */
export type Result<T, E extends DomainError = DomainError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

export const err = <E extends DomainError>(error: E): Result<never, E> => ({
  ok: false,
  error,
});

export const isOk = <T, E extends DomainError>(r: Result<T, E>): r is { ok: true; value: T } =>
  r.ok;

export const isErr = <T, E extends DomainError>(r: Result<T, E>): r is { ok: false; error: E } =>
  !r.ok;

/** Map over the success side, leaving errors untouched. */
export const mapResult = <T, U, E extends DomainError>(
  r: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> => {
  if (!r.ok) return r;
  return ok(fn(r.value));
};

/** Throw if the result is an error — useful in tests and boundaries that escalate. */
export const unwrap = <T, E extends DomainError>(r: Result<T, E>): T => {
  if (!r.ok) throw r.error;
  return r.value;
};
