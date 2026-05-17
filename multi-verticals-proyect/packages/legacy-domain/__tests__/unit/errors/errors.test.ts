import { describe, expect, it } from 'vitest';

import {
  ConflictError,
  DomainError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '#errors/base.errors.js';

describe('DomainError', () => {
  it('should be abstract and have code property', () => {
    const error = new ValidationError('test');
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
    expect(typeof error.code).toBe('string');
  });

  it('should set the name to the class name', () => {
    const error = new ValidationError('test');
    expect(error.name).toBe('ValidationError');
  });

  it('should set the message correctly', () => {
    const error = new ValidationError('invalid input');
    expect(error.message).toBe('invalid input');
  });
});

describe('ValidationError', () => {
  it('should have VALIDATION_ERROR code', () => {
    const error = new ValidationError('bad input');
    expect(error.code).toBe('VALIDATION_ERROR');
  });

  it('should store optional field name', () => {
    const error = new ValidationError('required', 'email');
    expect(error.field).toBe('email');
  });

  it('should default field to undefined', () => {
    const error = new ValidationError('required');
    expect(error.field).toBeUndefined();
  });

  it('should be instance of DomainError', () => {
    const error = new ValidationError('test');
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should preserve error name', () => {
    const error = new ValidationError('test');
    expect(error.name).toBe('ValidationError');
  });

  it('should be catchable as DomainError', () => {
    expect(new ValidationError('test') instanceof DomainError).toBe(true);
  });
});

describe('NotFoundError', () => {
  it('should have NOT_FOUND code', () => {
    const error = new NotFoundError('User', 'abc-123');
    expect(error.code).toBe('NOT_FOUND');
  });

  it('should format message with entity and id', () => {
    const error = new NotFoundError('Provider', 'prov-xyz');
    expect(error.message).toBe("Provider with id 'prov-xyz' not found");
  });

  it('should be instance of DomainError', () => {
    const error = new NotFoundError('User', 'id');
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
  });

  it('should handle special characters in id', () => {
    const error = new NotFoundError('Entity', 'id-with-dashes');
    expect(error.message).toContain('id-with-dashes');
  });
});

describe('UnauthorizedError', () => {
  it('should have UNAUTHORIZED code', () => {
    expect(new UnauthorizedError().code).toBe('UNAUTHORIZED');
  });

  it('should have default message', () => {
    expect(new UnauthorizedError().message).toBe('Not authorized to perform this action');
  });

  it('should accept custom message', () => {
    expect(new UnauthorizedError('access denied').message).toBe('access denied');
  });

  it('should be instance of DomainError', () => {
    expect(new UnauthorizedError()).toBeInstanceOf(DomainError);
  });
});

describe('ConflictError', () => {
  it('should have CONFLICT code', () => {
    expect(new ConflictError('already exists').code).toBe('CONFLICT');
  });

  it('should set custom message', () => {
    expect(new ConflictError('duplicate entry').message).toBe('duplicate entry');
  });

  it('should be instance of DomainError', () => {
    expect(new ConflictError('test')).toBeInstanceOf(DomainError);
  });
});

describe('Error hierarchy', () => {
  it('should allow catching by base DomainError', () => {
    const errors: DomainError[] = [
      new ValidationError('v'),
      new NotFoundError('E', '1'),
      new UnauthorizedError(),
      new ConflictError('c'),
    ];
    for (const error of errors) {
      expect(error instanceof DomainError).toBe(true);
      expect(error instanceof Error).toBe(true);
    }
  });

  it('should maintain correct names in inheritance chain', () => {
    expect(new ValidationError('test').name).toBe('ValidationError');
    expect(new NotFoundError('E', '1').name).toBe('NotFoundError');
    expect(new UnauthorizedError().name).toBe('UnauthorizedError');
    expect(new ConflictError('c').name).toBe('ConflictError');
  });
});
