import { describe, expect, it } from 'vitest';

import { ExternalId } from '#domain/value-objects/external-id.vo.js';

describe('ExternalId', () => {
  describe('create', () => {
    it('accepts valid source and id', () => {
      const result = ExternalId.create('idealista', 'abc123');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.source).toBe('idealista');
        expect(result.value.id).toBe('abc123');
      }
    });

    it('trims whitespace from source and id', () => {
      const result = ExternalId.create('  wallapop  ', '  id-001  ');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.source).toBe('wallapop');
        expect(result.value.id).toBe('id-001');
      }
    });

    it('fails for empty source', () => {
      const result = ExternalId.create('', 'abc123');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('EXTERNAL_ID_SOURCE_INVALID');
        expect(result.errors[0]?.path).toContain('source');
      }
    });

    it('fails for source exceeding 64 chars', () => {
      const result = ExternalId.create('a'.repeat(65), 'abc123');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('EXTERNAL_ID_SOURCE_INVALID');
      }
    });

    it('fails for empty id', () => {
      const result = ExternalId.create('idealista', '');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('EXTERNAL_ID_INVALID');
        expect(result.errors[0]?.path).toContain('id');
      }
    });

    it('fails for id exceeding 256 chars', () => {
      const result = ExternalId.create('idealista', 'x'.repeat(257));
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]?.code).toBe('EXTERNAL_ID_INVALID');
      }
    });

    it('accepts id of exactly 256 chars', () => {
      const result = ExternalId.create('source', 'x'.repeat(256));
      expect(result.success).toBe(true);
    });
  });

  describe('key', () => {
    it('returns source:id format', () => {
      const result = ExternalId.create('idealista', 'prop-42');
      expect(result.success && result.value.key).toBe('idealista:prop-42');
    });
  });

  describe('equals', () => {
    it('equal for same source and id', () => {
      const a = ExternalId.create('idealista', 'abc');
      const b = ExternalId.create('idealista', 'abc');
      expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    });

    it('not equal for different source', () => {
      const a = ExternalId.create('idealista', 'abc');
      const b = ExternalId.create('wallapop', 'abc');
      expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
    });

    it('not equal for different id', () => {
      const a = ExternalId.create('idealista', 'abc');
      const b = ExternalId.create('idealista', 'xyz');
      expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
    });
  });

  describe('toString / toJSON', () => {
    it('toString returns key', () => {
      const result = ExternalId.create('milanuncios', '12345');
      expect(result.success && result.value.toString()).toBe('milanuncios:12345');
    });

    it('toJSON returns source and id object', () => {
      const result = ExternalId.create('idealista', 'prop-99');
      expect(result.success && result.value.toJSON()).toEqual({
        source: 'idealista',
        id: 'prop-99',
      });
    });
  });
});
