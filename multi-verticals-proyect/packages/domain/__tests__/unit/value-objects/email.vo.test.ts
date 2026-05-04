import { describe, expect, it } from 'vitest';

import { Email } from '@domain/value-objects/email.vo.js';
import { ValueObject } from '@domain/value-objects/value-object.base.js';

describe('Email', () => {
  describe('create', () => {
    it('should create a valid email', () => {
      const result = Email.create('user@example.com');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeInstanceOf(Email);
        expect(result.value.value).toBe('user@example.com');
      }
    });

    it('should accept email with subdomains', () => {
      expect(Email.create('user@sub.example.co.uk').success).toBe(true);
    });

    it('should accept email with plus addressing', () => {
      expect(Email.create('user+tag@example.com').success).toBe(true);
    });

    it('should fail for empty string', () => {
      const result = Email.create('');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0]!.code).toBe('EMAIL_INVALID');
        expect(result.errors[0]!.path).toEqual(['email']);
      }
    });

    it('should fail for missing @', () => {
      expect(Email.create('notanemail').success).toBe(false);
    });

    it('should fail for missing domain', () => {
      expect(Email.create('user@').success).toBe(false);
    });

    it('should fail for missing local part', () => {
      expect(Email.create('@example.com').success).toBe(false);
    });

    it('should fail for email exceeding 254 characters', () => {
      expect(Email.create(`${'a'.repeat(250)}@b.c`).success).toBe(false);
    });
  });

  describe('equals', () => {
    it('should return true for same email value', () => {
      const r1 = Email.create('user@example.com');
      const r2 = Email.create('user@example.com');
      expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(true);
    });

    it('should return false for different email values', () => {
      const r1 = Email.create('user@example.com');
      const r2 = Email.create('other@example.com');
      expect(r1.success && r2.success && r1.value.equals(r2.value)).toBe(false);
    });

    it('should return false for non-Email objects', () => {
      const result = Email.create('user@example.com');
      if (!result.success) return;
      const fakeVo = { equals: () => false } as unknown as ValueObject;
      expect(result.value.equals(fakeVo)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the email value as string', () => {
      const result = Email.create('user@example.com');
      if (!result.success) return;
      expect(result.value.toString()).toBe('user@example.com');
      expect(`${result.value}`).toBe('user@example.com');
    });
  });

  describe('ValueObject inheritance', () => {
    it('should be an instance of ValueObject', () => {
      const result = Email.create('user@example.com');
      if (!result.success) return;
      expect(result.value).toBeInstanceOf(ValueObject);
    });
  });
});
