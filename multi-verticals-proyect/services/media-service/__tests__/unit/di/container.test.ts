import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Container } from '#di/container.js';
import { PgBossQueueAdapter } from '#infrastructure/adapters/queue/pg-boss.adapter.js';

const mockQueue = {
  start: vi.fn(),
  stop: vi.fn(),
  subscribe: vi.fn(),
};

vi.mock('#infrastructure/adapters/queue/pg-boss.adapter.js', () => {
  return {
    PgBossQueueAdapter: vi.fn().mockImplementation(function () {
      return mockQueue;
    }),
  };
});

let mockQueueEnabled = false;
let mockDatabaseUrl: string | undefined = undefined;

vi.mock('#infrastructure/config/env.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('#infrastructure/config/env.js')>();
  return {
    ...original,
    config: new Proxy(original.config, {
      get(target, prop) {
        if (prop === 'queueEnabled') return mockQueueEnabled;
        if (prop === 'databaseUrl') return mockDatabaseUrl;
        return Reflect.get(target, prop);
      },
    }),
  };
});

describe('Container DI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset private singleton instance
    (Container as unknown as { instance: Container | undefined }).instance = undefined;
    mockQueueEnabled = false;
    mockDatabaseUrl = undefined;
  });

  it('debería instanciar correctamente el Container como Singleton sin cola si queueEnabled es false', () => {
    mockQueueEnabled = false;
    mockDatabaseUrl = 'postgres://localhost/db';

    const container = Container.getInstance();
    expect(container).toBeDefined();
    expect(container.queue).toBeUndefined();
    expect(container.imagePipeline).toBeDefined();
    expect(container.processScraperImageUseCase).toBeDefined();
    expect(container.processInternalUploadUseCase).toBeDefined();
  });

  it('debería instanciar el Container con PgBossQueueAdapter si queueEnabled y databaseUrl están definidos', () => {
    mockQueueEnabled = true;
    mockDatabaseUrl = 'postgres://localhost/db';

    const container = Container.getInstance();
    expect(container.queue).toBeDefined();
    expect(PgBossQueueAdapter).toHaveBeenCalledWith('postgres://localhost/db');
  });

  it('debería iniciar, suscribir y detener la cola correctamente', async () => {
    mockQueueEnabled = true;
    mockDatabaseUrl = 'postgres://localhost/db';

    const container = Container.getInstance();

    // Mock del caso de uso de imagen
    const mockExecute = vi.spyOn(container.processScraperImageUseCase, 'execute');

    await container.startQueue();

    expect(mockQueue.start).toHaveBeenCalled();
    expect(mockQueue.subscribe).toHaveBeenCalledWith(
      'process-provider-images',
      expect.any(Function),
    );

    // Extraer callback del subscribe y probar flujo exitoso
    const subscribeCallback = mockQueue.subscribe.mock.calls[0]![1] as (payload: {
      imageUrl: string;
      sourceName?: string;
    }) => Promise<void>;

    mockExecute.mockResolvedValue({
      status: 'ok',
      id: 'asset-id',
      url: 'http://pic.jpg',
      hashes: { sha256: 'sha-val', phash: 'phash-val' },
      metadata: { format: 'webp', width: 200, height: 200, size: 2000 },
    } as unknown as Awaited<ReturnType<typeof mockExecute>>);

    await expect(
      subscribeCallback({ imageUrl: 'https://pic.jpg', sourceName: 'test-src' }),
    ).resolves.not.toThrow();
    expect(mockExecute).toHaveBeenCalledWith({
      imageUrl: 'https://pic.jpg',
      sourceName: 'test-src',
    });

    // Probar flujo cuando la imagen es rechazada
    mockExecute.mockResolvedValue({
      status: 'rejected',
      rejectReason: 'NSFW content detected',
    } as unknown as Awaited<ReturnType<typeof mockExecute>>);

    await expect(subscribeCallback({ imageUrl: 'https://pic.jpg' })).rejects.toThrow(
      'Queue scraper image processing rejected: NSFW content detected',
    );

    // Detener la cola
    await container.stopQueue();
    expect(mockQueue.stop).toHaveBeenCalled();
  });

  it('startQueue y stopQueue no deberían fallar si no hay cola instanciada', async () => {
    mockQueueEnabled = false;
    const container = Container.getInstance();

    await expect(container.startQueue()).resolves.not.toThrow();
    await expect(container.stopQueue()).resolves.not.toThrow();
  });
});
