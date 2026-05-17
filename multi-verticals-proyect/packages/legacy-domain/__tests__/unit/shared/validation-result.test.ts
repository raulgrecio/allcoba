import { describe, expect, it } from 'vitest';

import { combine, fail, failOne, ok } from '#shared/validation-result.js';

describe('ok', () => {
  it('returns success:true with value', () => {
    const result = ok(42);
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toBe(42);
  });

  it('works with object value', () => {
    const val = { x: 1 };
    const result = ok(val);
    expect(result.success).toBe(true);
    if (result.success) expect(result.value).toBe(val);
  });
});

describe('fail', () => {
  it('returns success:false with errors array', () => {
    const result = fail([{ code: 'ERR', message: 'bad' }]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.code).toBe('ERR');
    }
  });
});

describe('failOne', () => {
  it('creates single-error result', () => {
    const result = failOne('CODE', 'message');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.code).toBe('CODE');
      expect(result.errors[0]!.message).toBe('message');
      expect(result.errors[0]!.path).toBeUndefined();
    }
  });

  it('includes path when provided', () => {
    const result = failOne('CODE', 'message', ['field']);
    if (!result.success) {
      expect(result.errors[0]!.path).toEqual(['field']);
    }
  });
});

describe('combine', () => {
  it('returns ok with tuple of values when all succeed', () => {
    const result = combine([ok(1), ok('a'), ok(true)] as const);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value[0]).toBe(1);
      expect(result.value[1]).toBe('a');
      expect(result.value[2]).toBe(true);
    }
  });

  it('returns fail when one fails', () => {
    const result = combine([ok(1), failOne('ERR', 'bad')] as const);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors).toHaveLength(1);
  });

  it('aggregates errors from multiple failures', () => {
    const result = combine([failOne('ERR1', 'first'), failOne('ERR2', 'second'), ok(3)] as const);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toHaveLength(2);
      expect(result.errors.map((e) => e.code)).toEqual(['ERR1', 'ERR2']);
    }
  });
});
