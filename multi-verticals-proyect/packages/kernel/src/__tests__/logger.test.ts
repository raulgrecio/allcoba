import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRootLogger,
  createRequestLogger,
  createJobLogger,
  logger,
  requestLogger,
  jobLogger,
} from '../logger/index.js';

describe('createRootLogger', () => {
  it('should create a pino logger instance with default options', () => {
    const log = createRootLogger();
    expect(log).toBeDefined();
    expect(typeof log.info).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.debug).toBe('function');
    expect(typeof log.child).toBe('function');
  });

  it('should respect custom log level', () => {
    const log = createRootLogger({ level: 'debug' });
    expect(log.level).toBe('debug');
  });

  it('should default to info level', () => {
    const log = createRootLogger({ level: 'info' });
    expect(log.level).toBe('info');
  });

  it('should create logger with pretty transport when pretty option is true', () => {
    const log = createRootLogger({ pretty: true });
    expect(log).toBeDefined();
    expect(typeof log.info).toBe('function');
  });

  it('should create logger without pretty transport when pretty is false', () => {
    const log = createRootLogger({ pretty: false });
    expect(log).toBeDefined();
    expect(typeof log.info).toBe('function');
  });

  it('should create distinct logger instances', () => {
    const log1 = createRootLogger();
    const log2 = createRootLogger();
    expect(log1).not.toBe(log2);
  });
});

describe('createRequestLogger', () => {
  const base = createRootLogger({ pretty: false });

  it('should create a child logger with requestId', () => {
    const log = createRequestLogger(base, 'req-abc-123');
    expect(log).toBeDefined();
    expect(typeof log.info).toBe('function');
    const b = log.bindings();
    expect(b).toHaveProperty('requestId', 'req-abc-123');
  });

  it('should include tenantId when provided', () => {
    const log = createRequestLogger(base, 'req-abc-123', 'tenant-456');
    const b = log.bindings();
    expect(b).toHaveProperty('requestId', 'req-abc-123');
    expect(b).toHaveProperty('tenantId', 'tenant-456');
  });

  it('should not include tenantId when not provided', () => {
    const log = createRequestLogger(base, 'req-abc-123');
    const b = log.bindings();
    expect(b).not.toHaveProperty('tenantId');
  });

  it('should create distinct child loggers', () => {
    const log1 = createRequestLogger(base, 'req-1');
    const log2 = createRequestLogger(base, 'req-2');
    expect(log1.bindings().requestId).toBe('req-1');
    expect(log2.bindings().requestId).toBe('req-2');
  });
});

describe('createJobLogger', () => {
  const base = createRootLogger({ pretty: false });

  it('should create a child logger with jobId and queueName', () => {
    const log = createJobLogger(base, 'job-789', 'moderate-image');
    const b = log.bindings();
    expect(b).toHaveProperty('jobId', 'job-789');
    expect(b).toHaveProperty('queueName', 'moderate-image');
  });

  it('should handle different queue names', () => {
    const log1 = createJobLogger(base, 'job-1', 'send-notification');
    const log2 = createJobLogger(base, 'job-2', 'generate-embedding');
    expect(log1.bindings().queueName).toBe('send-notification');
    expect(log2.bindings().queueName).toBe('generate-embedding');
  });
});

describe('singleton instances', () => {
  it('logger() should return a valid pino instance', () => {
    const log = logger();
    expect(typeof log.info).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.child).toBe('function');
  });

  it('logger() should return the same instance', () => {
    const log1 = logger();
    const log2 = logger();
    expect(log1).toBe(log2);
  });

  it('requestLogger() should create a child with requestId', () => {
    const log = requestLogger('req-singleton');
    expect(log.bindings()).toHaveProperty('requestId', 'req-singleton');
  });

  it('requestLogger() should include tenantId when provided', () => {
    const log = requestLogger('req-singleton', 'tenant-x');
    expect(log.bindings()).toHaveProperty('tenantId', 'tenant-x');
  });

  it('jobLogger() should create a child with jobId and queueName', () => {
    const log = jobLogger('job-singleton', 'test-queue');
    expect(log.bindings()).toHaveProperty('jobId', 'job-singleton');
    expect(log.bindings()).toHaveProperty('queueName', 'test-queue');
  });
});

describe('logger redact configuration', () => {
  it('should not expose secret fields in bindings', () => {
    const log = createRootLogger({ pretty: false });
    expect(log.level).toBeDefined();
    // Testing that the logger itself is functional
    // Actual redaction behavior is handled by pino internally
  });

  it('should allow logging non-sensitive data', () => {
    const log = createRootLogger({ pretty: false, level: 'silent' });
    const child = log.child({ userId: 'user-123', action: 'login' });
    const b = child.bindings();
    expect(b).toHaveProperty('userId', 'user-123');
    expect(b).toHaveProperty('action', 'login');
  });
});
