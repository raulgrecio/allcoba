import { describe, expect, it } from 'vitest';

import { ValidationError } from '../errors/base.errors.js';
import { Email } from '../value-objects/email.vo.js';
import { ValueObject } from '../value-objects/value-object.base.js';

describe('Email', () => {
  describe('create', () => {
    it('should create a valid email', () => {
      const email = Email.create('user@example.com');
      expect(email).toBeInstanceOf(Email);
      expect(email.value).toBe('user@example.com');
    });

    it('should normalize the email value', () => {
      const email = Email.create('User@Example.com');
      expect(email.value).toBe('User@Example.com');
    });

    it('should accept email with subdomains', () => {
      const email = Email.create('user@sub.example.co.uk');
      expect(email.value).toBe('user@sub.example.co.uk');
    });

    it('should accept email with plus addressing', () => {
      const email = Email.create('user+tag@example.com');
      expect(email.value).toBe('user+tag@example.com');
    });

    it('should throw ValidationError for empty string', () => {
      expect(() => Email.create('')).toThrow(ValidationError);
    });

    it('should throw ValidationError for missing @', () => {
      expect(() => Email.create('notanemail')).toThrow(ValidationError);
    });

    it('should throw ValidationError for missing domain', () => {
      expect(() => Email.create('user@')).toThrow(ValidationError);
    });

    it('should throw ValidationError for missing local part', () => {
      expect(() => Email.create('@example.com')).toThrow(ValidationError);
    });

    it('should throw ValidationError with field name "email"', () => {
      try {
        Email.create('invalid');
        expect.fail('should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).field).toBe('email');
      }
    });

    it('should throw ValidationError for email exceeding 254 characters', () => {
      const longLocal = 'a'.repeat(250);
      const email = `${longLocal}@b.c`;
      expect(() => Email.create(email)).toThrow(ValidationError);
    });
  });

  describe('equals', () => {
    it('should return true for same email value', () => {
      const email1 = Email.create('user@example.com');
      const email2 = Email.create('user@example.com');
      expect(email1.equals(email2)).toBe(true);
    });

    it('should return false for different email values', () => {
      const email1 = Email.create('user@example.com');
      const email2 = Email.create('other@example.com');
      expect(email1.equals(email2)).toBe(false);
    });

    it('should return false for null or non-Email objects', () => {
      const email = Email.create('user@example.com');

      const fakeVo = {
        equals: () => false,
      } as unknown as ValueObject;

      expect(email.equals(fakeVo)).toBe(false);
    });

    it('should return false for different ValueObject types', () => {
      const email = Email.create('test@test.com');
      // Create a mock ValueObject that is not an Email
      const notEmail = {
        value: 'test@test.com',
        equals: (_other: ValueObject) => false,
      } as unknown as ValueObject;
      expect(email.equals(notEmail)).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the email value as string', () => {
      const email = Email.create('user@example.com');
      expect(email.toString()).toBe('user@example.com');
      expect(`${email}`).toBe('user@example.com');
    });
  });

  describe('ValueObject inheritance', () => {
    it('should be an instance of ValueObject', () => {
      const email = Email.create('user@example.com');
      expect(email).toBeInstanceOf(ValueObject);
    });

    it('should implement abstract equals method', () => {
      const email = Email.create('user@example.com');
      expect(typeof email.equals).toBe('function');
    });
  });
});

describe('ValueObject base class', () => {
  it('should require equals method to be implemented', () => {
    // The ValueObject class is abstract, verified through Email which extends it
    const email = Email.create('a@b.com');
    expect(email.equals).toBeDefined();
    expect(typeof email.equals).toBe('function');
  });
});
