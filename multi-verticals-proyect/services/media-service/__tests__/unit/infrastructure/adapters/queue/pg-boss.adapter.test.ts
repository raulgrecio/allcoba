import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PgBossQueueAdapter } from '#infrastructure/adapters/queue/pg-boss.adapter.js';

const mockBoss = {
  start: vi.fn(),
  stop: vi.fn(),
  work: vi.fn(),
  on: vi.fn(),
};

vi.mock('pg-boss', () => {
  return {
    PgBoss: vi.fn().mockImplementation(function () {
      return mockBoss;
    }),
  };
});

describe('PgBossQueueAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debería inicializar pg-boss y registrar un listener de error en el constructor', () => {
    const adapter = new PgBossQueueAdapter('postgres://localhost/db');
    expect(adapter).toBeDefined();
    // Simular que salta el listener de error
    const errorHandler = mockBoss.on.mock.calls[0]![1] as (error: Error) => void;
    expect(() => errorHandler(new Error('Fatal pg-boss error'))).not.toThrow();
  });

  it('debería arrancar el consumidor de colas al llamar a start()', async () => {
    const adapter = new PgBossQueueAdapter('postgres://localhost/db');
    await adapter.start();
    expect(mockBoss.start).toHaveBeenCalled();
  });

  it('debería detener el consumidor de colas al llamar a stop()', async () => {
    const adapter = new PgBossQueueAdapter('postgres://localhost/db');
    await adapter.stop();
    expect(mockBoss.stop).toHaveBeenCalled();
  });

  it('debería suscribirse a la cola y procesar trabajos exitosamente', async () => {
    const adapter = new PgBossQueueAdapter('postgres://localhost/db');
    const mockHandler = vi.fn().mockResolvedValue(undefined);

    await adapter.subscribe('process-provider-images', mockHandler);

    expect(mockBoss.work).toHaveBeenCalledWith('process-provider-images', expect.any(Function));

    // Extraer y ejecutar el callback pasado a boss.work
    const workCallback = mockBoss.work.mock.calls[0]![1] as (job: unknown) => Promise<void>;
    const mockJob = {
      id: 'job-uuid-1',
      data: { test: 'payload' },
    };

    await workCallback(mockJob);
    expect(mockHandler).toHaveBeenCalledWith({ test: 'payload' });
  });

  it('debería propagar el error si el handler de suscripción falla para permitir reintentos', async () => {
    const adapter = new PgBossQueueAdapter('postgres://localhost/db');
    const mockHandler = vi.fn().mockRejectedValue(new Error('Worker failure'));

    await adapter.subscribe('process-provider-images', mockHandler);

    const workCallback = mockBoss.work.mock.calls[0]![1] as (job: unknown) => Promise<void>;
    const mockJob = {
      id: 'job-uuid-2',
      data: { test: 'payload' },
    };

    await expect(workCallback(mockJob)).rejects.toThrow('Worker failure');
  });
});
