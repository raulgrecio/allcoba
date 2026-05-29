import fs from 'fs/promises';
import path from 'path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { LocalStorageAdapter } from '#infrastructure/adapters/storage/local-storage.adapter.js';

describe('LocalStorageAdapter', () => {
  const testDir = path.resolve(process.cwd(), '__data/test-storage-media');
  let adapter: LocalStorageAdapter;

  beforeAll(async () => {
    // Asegurar limpieza inicial
    await fs.rm(testDir, { recursive: true, force: true });
    adapter = new LocalStorageAdapter({ baseDir: '__data/test-storage-media' });
  });

  afterAll(async () => {
    // Limpieza al finalizar
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should initialize the directory successfully', async () => {
    await expect(adapter.init()).resolves.not.toThrow();
    const stat = await fs.stat(testDir);
    expect(stat.isDirectory()).toBe(true);
  });

  it('should handle initialization error gracefully if directory creation fails', async () => {
    const errorAdapter = new LocalStorageAdapter({ baseDir: '__data/test-storage-media-error' });
    const spy = vi.spyOn(fs, 'mkdir').mockRejectedValueOnce(new Error('Permission denied'));

    await expect(errorAdapter.init()).resolves.not.toThrow();

    spy.mockRestore();
  });

  it('should upload a buffer and return file:// path', async () => {
    const buffer = Buffer.from('test-content');
    const fileName = 'subdir/test-file.txt';

    const result = await adapter.upload(buffer, fileName, 'text/plain');

    const expectedPath = path.join(testDir, fileName);
    expect(result).toBe(`file://${expectedPath}`);

    const fileContent = await fs.readFile(expectedPath, 'utf8');
    expect(fileContent).toBe('test-content');
  });

  it('should return true/false on exists check', async () => {
    const fileExists = await adapter.exists('subdir/test-file.txt');
    expect(fileExists).toBe(true);

    const fileNotExists = await adapter.exists('subdir/nonexistent.txt');
    expect(fileNotExists).toBe(false);
  });

  it('should delete a file correctly', async () => {
    await expect(adapter.delete('subdir/test-file.txt')).resolves.not.toThrow();

    const fileExists = await adapter.exists('subdir/test-file.txt');
    expect(fileExists).toBe(false);
  });

  it('should handle delete gracefully if file does not exist', async () => {
    await expect(adapter.delete('subdir/nonexistent.txt')).resolves.not.toThrow();
  });

  it('should prevent directory traversal during upload', async () => {
    const buffer = Buffer.from('malicious-content');
    const maliciousFileName = '../../malicious-file.txt';

    await expect(adapter.upload(buffer, maliciousFileName, 'text/plain')).rejects.toThrow(
      'Directory traversal attempt detected',
    );
  });

  it('should prevent directory traversal during exists check', async () => {
    const fileExists = await adapter.exists('../../malicious-file.txt');
    expect(fileExists).toBe(false);
  });

  it('should prevent directory traversal during delete check', async () => {
    await expect(adapter.delete('../../malicious-file.txt')).resolves.not.toThrow();
  });
});
