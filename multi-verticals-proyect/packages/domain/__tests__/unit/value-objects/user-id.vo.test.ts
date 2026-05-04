import { describe, expect, it } from 'vitest';

import { UserId } from '@domain/value-objects/user-id.vo.js';

const VALID_UUID = 'a1b2c3d4-e5f6-4789-abcd-ef0123456789';

describe('UserId.create', () => {
  it('creates from valid UUID', () => {
    const result = UserId.create(VALID_UUID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBeInstanceOf(UserId);
      expect(result.value.value).toBe(VALID_UUID);
    }
  });

  it('fails for empty string', () => {
    const result = UserId.create('');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors[0]!.code).toBe('USER_ID_INVALID');
  });

  it('fails for non-UUID string', () => {
    expect(UserId.create('not-a-uuid').success).toBe(false);
  });

});

describe('UserId.generate', () => {
  it('produces a valid UserId instance', () => {
    const id = UserId.generate();
    expect(id).toBeInstanceOf(UserId);
    expect(id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('produces unique values', () => {
    const ids = Array.from({ length: 10 }, () => UserId.generate().value);
    expect(new Set(ids).size).toBe(10);
  });
});

describe('UserId.equals', () => {
  it('returns true for same UUID value', () => {
    const r1 = UserId.create(VALID_UUID);
    const r2 = UserId.create(VALID_UUID);
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(true);
  });

  it('returns false for different UUID value', () => {
    const r1 = UserId.create(VALID_UUID);
    const r2 = UserId.generate();
    expect(r1.success && r1.value.equals(r2)).toBe(false);
  });
});

describe('UserId serialization', () => {
  it('toString returns raw UUID', () => {
    const result = UserId.create(VALID_UUID);
    if (!result.success) return;
    expect(result.value.toString()).toBe(VALID_UUID);
  });

  it('toJSON returns raw UUID', () => {
    const result = UserId.create(VALID_UUID);
    if (!result.success) return;
    expect(result.value.toJSON()).toBe(VALID_UUID);
    expect(JSON.stringify({ id: result.value })).toBe(`{"id":"${VALID_UUID}"}`);
  });
});
