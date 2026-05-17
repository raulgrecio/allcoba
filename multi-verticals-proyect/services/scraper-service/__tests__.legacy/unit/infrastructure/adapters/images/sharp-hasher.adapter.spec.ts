import { describe, expect, it, vi } from 'vitest';

import { SharpHasherAdapter } from '#infrastructure/adapters/images/sharp-hasher.adapter.js';

// Mock sharp
vi.mock('sharp', () => {
  return {
    default: vi.fn().mockReturnValue({
      greyscale: vi.fn().mockReturnThis(),
      resize: vi.fn().mockReturnThis(),
      raw: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue({
        data: Buffer.alloc(64, 128), // 64 pixels with value 128
      }),
    }),
  };
});

describe('Unit: SharpHasherAdapter', () => {
  const adapter = new SharpHasherAdapter();

  it('debería calcular la distancia de Hamming entre dos hashes hex', () => {
    // 0000... vs 1111... en binario
    const hash1 = '0000000000000000';
    const hash2 = 'ffffffffffffffff';
    const distance = adapter.calculateDistance(hash1, hash2);
    expect(distance).toBe(64);
  });

  it('debería calcular distancia 0 para hashes iguales', () => {
    const hash = 'a1b2c3d4e5f60718';
    expect(adapter.calculateDistance(hash, hash)).toBe(0);
  });

  it('debería generar un hash consistente para un Buffer', async () => {
    const buffer = Buffer.alloc(100);
    const hash = await adapter.generateHash(buffer);
    expect(hash).toBeDefined();
    expect(hash.length).toBe(16); // 64 bits = 16 hex chars
  });
});
