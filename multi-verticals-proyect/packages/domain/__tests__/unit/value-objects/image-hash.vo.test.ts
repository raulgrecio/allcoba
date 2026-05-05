import { describe, expect, it } from 'vitest';

import { ImageHash } from '@domain/value-objects/image-hash.vo.js';

describe('ImageHash', () => {
  describe('create', () => {
    it('accepts 16 lowercase hex chars', () => {
      const result = ImageHash.create('a1b2c3d4e5f60718');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('a1b2c3d4e5f60718');
      }
    });

    it('normalizes uppercase to lowercase', () => {
      const result = ImageHash.create('A1B2C3D4E5F60718');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('a1b2c3d4e5f60718');
      }
    });

    it('trims whitespace before validation', () => {
      const result = ImageHash.create('  a1b2c3d4e5f60718  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('a1b2c3d4e5f60718');
      }
    });

    it('fails for 15 chars (too short)', () => {
      const result = ImageHash.create('a1b2c3d4e5f6071');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].code).toBe('IMAGE_HASH_INVALID');
        expect(result.errors[0].path).toContain('imageHash');
      }
    });

    it('fails for 17 chars (too long)', () => {
      const result = ImageHash.create('a1b2c3d4e5f607189');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].code).toBe('IMAGE_HASH_INVALID');
      }
    });

    it('fails for non-hex chars', () => {
      const result = ImageHash.create('a1b2c3d4e5f6071g');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].code).toBe('IMAGE_HASH_INVALID');
      }
    });

    it('fails for empty string', () => {
      const result = ImageHash.create('');
      expect(result.success).toBe(false);
    });
  });

  describe('equals', () => {
    it('equal for same hash', () => {
      const a = ImageHash.create('a1b2c3d4e5f60718');
      const b = ImageHash.create('a1b2c3d4e5f60718');
      expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    });

    it('equal regardless of input case', () => {
      const a = ImageHash.create('A1B2C3D4E5F60718');
      const b = ImageHash.create('a1b2c3d4e5f60718');
      expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    });

    it('not equal for different hashes', () => {
      const a = ImageHash.create('a1b2c3d4e5f60718');
      const b = ImageHash.create('0000000000000000');
      expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
    });
  });

  describe('toString / toJSON', () => {
    it('toString returns hex string', () => {
      const result = ImageHash.create('a1b2c3d4e5f60718');
      expect(result.success && result.value.toString()).toBe('a1b2c3d4e5f60718');
    });

    it('toJSON returns hex string', () => {
      const result = ImageHash.create('a1b2c3d4e5f60718');
      expect(result.success && result.value.toJSON()).toBe('a1b2c3d4e5f60718');
    });
  });
});
