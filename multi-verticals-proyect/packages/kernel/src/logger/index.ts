import pino, { type Logger as PinoLogger } from 'pino';

import { config } from '../config/index.js';

export type Logger = PinoLogger;

const REDACT_PATHS = [
  'dek',
  'kek',
  'password',
  'passwordHash',
  'token',
  'secret',
  'authorization',
  'derivedKey',
  'kekEnc',
  'dekEnc',
  '*.dek',
  '*.kek',
  'req.headers.authorization',
] as const;

export function createRootLogger(opts?: {
  level?: string;
  pretty?: boolean;
  service?: string;
}): Logger {
  const level = opts?.level ?? config.logLevel;
  const pretty = opts?.pretty ?? config.isDevelopment;

  const logger = pino({
    level,
    redact: {
      paths: REDACT_PATHS as unknown as string[],
      censor: '[REDACTED]',
    },
    transport: pretty ? { target: 'pino-pretty', options: { colorize: true } } : undefined,
  });

  return opts?.service ? logger.child({ service: opts.service }) : logger;
}

export function createRequestLogger(base: Logger, requestId: string, tenantId?: string): Logger {
  return tenantId ? base.child({ requestId, tenantId }) : base.child({ requestId });
}

export function createJobLogger(base: Logger, jobId: string, queueName: string): Logger {
  return base.child({ jobId, queueName });
}

const defaultLogger: Logger = createRootLogger();

export function logger(): Logger {
  return defaultLogger;
}

export function requestLogger(requestId: string, tenantId?: string): Logger {
  return createRequestLogger(defaultLogger, requestId, tenantId);
}

export function jobLogger(jobId: string, queueName: string): Logger {
  return createJobLogger(defaultLogger, jobId, queueName);
}
