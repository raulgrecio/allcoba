import fs from 'fs/promises';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalStorageAdapter } from '#infrastructure/adapters/storage/local-storage.adapter.js';

vi.mock('fs/promises');

describe('Unit: LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;
  const baseDir = 'test-storage';

  beforeEach(() => {
    vi.resetAllMocks();
    adapter = new LocalStorageAdapter({ baseDir });
  });

  it('debería inicializar el directorio de almacenamiento', async () => {
    await adapter.init();
    expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining(baseDir), { recursive: true });
  });

  it('debería subir un archivo correctamente', async () => {
    const buffer = Buffer.from('test data');
    const fileName = 'test.txt';

    const url = await adapter.upload(buffer, fileName, 'text/plain');

    expect(fs.mkdir).toHaveBeenCalled();
    expect(fs.writeFile).toHaveBeenCalledWith(expect.stringContaining(fileName), buffer);
    expect(url).toContain('file://');
    expect(url).toContain(fileName);
  });

  it('debería verificar si un archivo existe', async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    const exists = await adapter.exists('exists.txt');
    expect(exists).toBe(true);

    vi.mocked(fs.access).mockRejectedValue(new Error('no access'));
    const notExists = await adapter.exists('missing.txt');
    expect(notExists).toBe(false);
  });

  it('debería eliminar un archivo', async () => {
    await adapter.delete('delete-me.txt');
    expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('delete-me.txt'));
  });
});
