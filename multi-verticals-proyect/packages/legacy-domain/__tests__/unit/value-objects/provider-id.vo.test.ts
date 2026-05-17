import { describe, expect, it } from 'vitest';

import { ProviderId } from '#value-objects/provider-id.vo.js';
import { UserId } from '#value-objects/user-id.vo.js';

const VALID_UUID = 'b2c3d4e5-f6a7-4890-bcde-f01234567890';

describe('ProviderId.create', () => {
  it('creates from valid UUID', () => {
    const result = ProviderId.create(VALID_UUID);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value).toBeInstanceOf(ProviderId);
      expect(result.value.value).toBe(VALID_UUID);
    }
  });

  it('fails for empty string', () => {
    const result = ProviderId.create('');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors[0]!.code).toBe('PROVIDER_ID_INVALID');
  });

  it('fails for non-UUID string', () => {
    expect(ProviderId.create('not-a-uuid').success).toBe(false);
  });
});

describe('ProviderId.generate', () => {
  it('produces a valid ProviderId', () => {
    const id = ProviderId.generate();
    expect(id).toBeInstanceOf(ProviderId);
    expect(id.value).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it('produces unique values', () => {
    const ids = Array.from({ length: 10 }, () => ProviderId.generate().value);
    expect(new Set(ids).size).toBe(10);
  });
});

describe('ProviderId.equals', () => {
  it('returns true for same UUID', () => {
    const r1 = ProviderId.create(VALID_UUID);
    const r2 = ProviderId.create(VALID_UUID);
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(true);
  });

  it('returns false for different UUID', () => {
    const r1 = ProviderId.create(VALID_UUID);
    const r2 = ProviderId.generate();
    expect(r1.success && r1.value.equals(r2)).toBe(false);
  });

  it('does not equal UserId with same value', () => {
    const pid = ProviderId.create(VALID_UUID);
    const uid = UserId.create(VALID_UUID);
    expect(pid.success && uid.success && pid.value.equals(uid.value)).toBe(false);
  });
});

describe('ProviderId serialization', () => {
  it('toString returns UUID', () => {
    const result = ProviderId.create(VALID_UUID);
    if (!result.success) return;
    expect(result.value.toString()).toBe(VALID_UUID);
  });

  it('toJSON returns UUID', () => {
    const result = ProviderId.create(VALID_UUID);
    if (!result.success) return;
    expect(JSON.stringify({ id: result.value })).toBe(`{"id":"${VALID_UUID}"}`);
  });
});
