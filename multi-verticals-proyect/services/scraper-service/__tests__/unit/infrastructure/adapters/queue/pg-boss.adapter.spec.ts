import PgBoss from 'pg-boss';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PgBossQueueAdapter } from '@scraper/infrastructure/adapters/queue/pg-boss.adapter.js';

vi.mock('pg-boss', () => {
  const mockBoss = {
    on: vi.fn(),
    start: vi.fn().mockResolvedValue({}),
    stop: vi.fn().mockResolvedValue({}),
    send: vi.fn().mockResolvedValue('job-id-123'),
    work: vi.fn().mockResolvedValue({}),
    schedule: vi.fn().mockResolvedValue({}),
  };
  return {
    default: vi.fn().mockImplementation(() => mockBoss),
  };
});

describe('Unit: PgBossQueueAdapter', () => {
  let adapter: PgBossQueueAdapter;
  const dbUrl = 'postgresql://localhost:5432';

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new PgBossQueueAdapter(dbUrl);
  });

  it('debería manejar errores de publicación', async () => {
    const bossInstance = vi.mocked(PgBoss).mock.results[0]!.value;
    bossInstance.send.mockRejectedValue(new Error('Send failed'));

    const id = await adapter.publish('test', {});
    expect(id).toBeNull();
  });

  it('debería manejar errores en el handler de suscripción', async () => {
    const bossInstance = vi.mocked(PgBoss).mock.results[0]!.value;
    const handler = vi.fn().mockRejectedValue(new Error('Handler failed'));

    await adapter.subscribe('test', handler);

    // Simular ejecución del worker
    const workerFn = bossInstance.work.mock.calls[0][1];
    await expect(workerFn({ data: {}, id: '1' })).rejects.toThrow('Handler failed');
  });

  it('debería programar un job (schedule)', async () => {
    await adapter.schedule('cron-job', '* * * * *', { data: 1 });
    const bossInstance = vi.mocked(PgBoss).mock.results[0]!.value;
    expect(bossInstance.schedule).toHaveBeenCalledWith('cron-job', '* * * * *', { data: 1 });
  });

  it('debería registrar errores del bus', () => {
    const bossInstance = vi.mocked(PgBoss).mock.results[0]!.value;
    const errorListener = bossInstance.on.mock.calls.find((c: string[]) => c[0] === 'error')[1];
    expect(errorListener).toBeDefined();
    errorListener(new Error('Bus error'));
  });

  it('debería publicar con opciones', async () => {
    await adapter.publish('job', {}, { priority: 10, retryLimit: 5 });
    const bossInstance = vi.mocked(PgBoss).mock.results[0]!.value;
    expect(bossInstance.send).toHaveBeenCalledWith(
      'job',
      {},
      expect.objectContaining({ priority: 10, retryLimit: 5 }),
    );
  });
});
