import { beforeEach, describe, expect, it, vi } from 'vitest';
import fastify from 'fastify';

import { Container } from '#di/container.js';
import { mediaRoutes } from '#infrastructure/http/media.routes.js';

vi.mock('#di/container.js', () => {
  return {
    Container: {
      getInstance: vi.fn(),
    },
  };
});

describe('MediaRoutes', () => {
  const mockProcessScraper = {
    execute: vi.fn(),
  };
  const mockProcessInternal = {
    execute: vi.fn(),
  };

  let app: ReturnType<typeof fastify>;

  beforeEach(async () => {
    vi.restoreAllMocks();

    vi.mocked(Container.getInstance).mockReturnValue({
      processScraperImageUseCase: mockProcessScraper,
      processInternalUploadUseCase: mockProcessInternal,
    } as unknown as Container);

    app = fastify({ logger: false });
    await app.register(mediaRoutes);
  });

  it('debería retornar 400 Bad Request si no se provee imageUrl ni imageBufferBase64', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/media/process',
      payload: {
        sourceName: 'test',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Bad Request');
    expect(body.message).toContain('Either imageBufferBase64 or imageUrl must be provided.');
  });

  it('debería procesar con processScraperImageUseCase si se provee imageUrl', async () => {
    const mockResult = {
      id: 'scraper-id',
      url: 'https://test.com/pic.jpg',
      status: 'ok',
      hashes: { sha256: 'sha-val', phash: 'phash-val' },
      metadata: { format: 'webp', width: 200, height: 200, size: 2000 },
      normalizedBuffer: Buffer.from('normalized-data'),
      thumbnailBuffer: Buffer.from('thumb-data'),
    };
    mockProcessScraper.execute.mockResolvedValue(mockResult);

    const response = await app.inject({
      method: 'POST',
      url: '/media/process',
      payload: {
        imageUrl: 'https://test.com/pic.jpg',
        sourceName: 'scraper-source',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockProcessScraper.execute).toHaveBeenCalledWith({
      imageUrl: 'https://test.com/pic.jpg',
      sourceName: 'scraper-source',
    });

    const body = JSON.parse(response.body);
    expect(body.id).toBe('scraper-id');
    expect(body.normalizedBufferBase64).toBe(Buffer.from('normalized-data').toString('base64'));
    expect(body.thumbnailBufferBase64).toBe(Buffer.from('thumb-data').toString('base64'));
    expect(body.normalizedBuffer).toBeUndefined(); // Debe haberse eliminado de la serialización
    expect(body.thumbnailBuffer).toBeUndefined();
  });

  it('debería procesar con processInternalUploadUseCase si se provee imageBufferBase64', async () => {
    const mockResult = {
      id: 'internal-id',
      url: 'internal://upload',
      status: 'ok',
      hashes: { sha256: 'sha-val', phash: 'phash-val' },
      metadata: { format: 'webp', width: 200, height: 200, size: 2000 },
      normalizedBuffer: undefined,
      thumbnailBuffer: undefined,
    };
    mockProcessInternal.execute.mockResolvedValue(mockResult);

    const base64Payload = Buffer.from('test-raw-buffer').toString('base64');

    const response = await app.inject({
      method: 'POST',
      url: '/media/process',
      payload: {
        imageBufferBase64: base64Payload,
        sourceName: 'user-upload',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(mockProcessInternal.execute).toHaveBeenCalledWith({
      imageBuffer: expect.any(Buffer),
      sourceName: 'user-upload',
    });

    const body = JSON.parse(response.body);
    expect(body.id).toBe('internal-id');
  });

  it('debería retornar 500 si ocurre un error inesperado al procesar la imagen', async () => {
    mockProcessScraper.execute.mockRejectedValue(new Error('Unexpected system error'));

    const response = await app.inject({
      method: 'POST',
      url: '/media/process',
      payload: {
        imageUrl: 'https://test.com/error.jpg',
      },
    });

    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Internal Server Error');
    expect(body.message).toContain(
      'Unexpected error during image processing: Unexpected system error',
    );
  });
});
