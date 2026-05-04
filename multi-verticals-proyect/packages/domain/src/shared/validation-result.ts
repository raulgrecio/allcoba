export type ValidationIssue = {
  code: string;
  message: string;
  path?: string[];
};

export type ValidationResult<T> =
  | { success: true; value: T }
  | { success: false; errors: ValidationIssue[] };

export const ok = <T>(value: T): ValidationResult<T> => ({
  success: true,
  value,
});

export const fail = <T = never>(errors: ValidationIssue[]): ValidationResult<T> => ({
  success: false,
  errors,
});

export const failOne = <T = never>(
  code: string,
  message: string,
  path?: string[],
): ValidationResult<T> => fail([{ code, message, path }]);

export function combine<T extends readonly ValidationResult<unknown>[]>(
  results: T,
): ValidationResult<{
  [K in keyof T]: T[K] extends ValidationResult<infer U> ? U : never;
}> {
  const errors = results.flatMap((r) => (r.success ? [] : r.errors));
  if (errors.length > 0) return fail(errors);
  const values = results.map((r) => (r as { success: true; value: unknown }).value);
  return ok(values as never);
}
