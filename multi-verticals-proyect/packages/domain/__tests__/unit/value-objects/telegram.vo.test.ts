import { describe, expect, it } from 'vitest';

import { Telegram } from '@domain/value-objects/telegram.vo.js';

describe('Telegram.create', () => {
  it('accepts valid handle without @', () => {
    const result = Telegram.create('allcoba_bot');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.handle).toBe('allcoba_bot');
      expect(result.value.display).toBe('@allcoba_bot');
    }
  });

  it('strips leading @ and accepts handle', () => {
    const result = Telegram.create('@allcoba_bot');
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.handle).toBe('allcoba_bot');
  });

  it('accepts 5-char minimum handle', () => {
    expect(Telegram.create('abcde').success).toBe(true);
  });

  it('accepts 32-char maximum handle', () => {
    expect(Telegram.create('a' + 'b'.repeat(30) + 'c').success).toBe(true);
  });

  it('accepts handle with digits', () => {
    expect(Telegram.create('user123ab').success).toBe(true);
  });

  it('fails for 4-char handle (too short)', () => {
    const result = Telegram.create('abcd');
    expect(result.success).toBe(false);
    if (!result.success) expect(result.errors[0]!.code).toBe('TELEGRAM_INVALID_FORMAT');
  });

  it('fails for 33-char handle (too long)', () => {
    expect(Telegram.create('a' + 'b'.repeat(31) + 'c').success).toBe(false);
  });

  it('fails for handle starting with underscore', () => {
    expect(Telegram.create('_username').success).toBe(false);
  });

  it('fails for handle ending with underscore', () => {
    expect(Telegram.create('username_').success).toBe(false);
  });

  it('fails for empty string', () => {
    expect(Telegram.create('').success).toBe(false);
  });

  it('fails for handle with spaces', () => {
    expect(Telegram.create('user name').success).toBe(false);
  });
});

describe('Telegram.equals', () => {
  it('returns true for same handle', () => {
    const r1 = Telegram.create('allcoba_bot');
    const r2 = Telegram.create('allcoba_bot');
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(true);
  });

  it('is case-insensitive', () => {
    const r1 = Telegram.create('AllcobaBot');
    const r2 = Telegram.create('allcobabot');
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(true);
  });

  it('returns false for different handles', () => {
    const r1 = Telegram.create('allcoba_bot');
    const r2 = Telegram.create('otheruser1');
    expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(false);
  });
});

describe('Telegram serialization', () => {
  it('toString returns @handle', () => {
    const result = Telegram.create('allcoba_bot');
    if (!result.success) return;
    expect(result.value.toString()).toBe('@allcoba_bot');
  });

  it('toJSON returns handle without @', () => {
    const result = Telegram.create('allcoba_bot');
    if (!result.success) return;
    expect(JSON.stringify({ tg: result.value })).toBe('{"tg":"allcoba_bot"}');
  });
});
