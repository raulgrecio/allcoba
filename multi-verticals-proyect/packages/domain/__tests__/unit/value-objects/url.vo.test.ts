import { describe, expect, it } from 'vitest';

import { Url } from '#value-objects/url.vo.js';

describe('Url', () => {
  describe('create', () => {
    it('accepts http URL', () => {
      const result = Url.create('http://example.com/path');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('http://example.com/path');
        expect(result.value.origin).toBe('http://example.com');
        expect(result.value.pathname).toBe('/path');
      }
    });

    it('accepts https URL', () => {
      const result = Url.create('https://allcoba.com/providers?page=1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.origin).toBe('https://allcoba.com');
      }
    });

    it('normalizes URL via URL parser', () => {
      const result = Url.create('HTTPS://Example.COM/Path');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe('https://example.com/Path');
      }
    });

    it('fails for malformed URL', () => {
      const result = Url.create('not-a-url');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]!.code).toBe('URL_INVALID_FORMAT');
        expect(result.errors[0]!.path).toContain('url');
      }
    });

    it('fails for ftp protocol', () => {
      const result = Url.create('ftp://files.example.com/file.txt');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]!.code).toBe('URL_PROTOCOL_NOT_ALLOWED');
      }
    });

    it('fails for javascript: protocol', () => {
      const result = Url.create('javascript:alert(1)');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]!.code).toBe('URL_PROTOCOL_NOT_ALLOWED');
      }
    });
  });

  describe('equals', () => {
    it('equal for same href', () => {
      const a = Url.create('https://example.com/');
      const b = Url.create('https://example.com/');
      expect(a.success && b.success && a.value.equals(b.value)).toBe(true);
    });

    it('not equal for different URLs', () => {
      const a = Url.create('https://example.com/a');
      const b = Url.create('https://example.com/b');
      expect(a.success && b.success && a.value.equals(b.value)).toBe(false);
    });
  });

  describe('toString / toJSON', () => {
    it('toString returns full href', () => {
      const result = Url.create('https://example.com/path');
      expect(result.success && result.value.toString()).toBe('https://example.com/path');
    });

    it('toJSON returns full href', () => {
      const result = Url.create('https://example.com/path');
      expect(result.success && result.value.toJSON()).toBe('https://example.com/path');
    });
  });
});
