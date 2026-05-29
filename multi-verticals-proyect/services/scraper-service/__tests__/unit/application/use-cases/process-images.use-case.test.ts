import { describe, expect, it, vi } from 'vitest';

import type { QueuePort } from '#application/ports/queue.port.js';
import type { ScrapedImageRepositoryPort } from '#application/ports/scraped-image-repository.port.js';
import { ProcessImagesUseCase } from '#application/use-cases/process-images.use-case.js';

const PAYLOAD = {
  providerId: 'provider-123',
  imageUrls: ['https://src.com/img1.jpg', 'https://src.com/img2.jpg'],
  source: 'topescortbabes',
  vertical: 'dating' as const,
};

type FakeQueue = QueuePort & { publish: ReturnType<typeof vi.fn> };
const makeQueue = (): FakeQueue => ({
  publish: vi.fn().mockResolvedValue('job-id'),
  subscribe: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
});

type FakeImageRepo = ScrapedImageRepositoryPort & {
  findSeenUrls: ReturnType<typeof vi.fn>;
};
const makeImageRepo = (): FakeImageRepo => ({
  hasUrl: vi.fn().mockResolvedValue(false),
  findSeenUrls: vi.fn().mockResolvedValue([]),
  markSeen: vi.fn().mockResolvedValue(undefined),
});

describe('ProcessImagesUseCase', () => {
  it('should publish all images to process-media queue when none are seen', async () => {
    const queue = makeQueue();
    const imageRepo = makeImageRepo();
    const useCase = new ProcessImagesUseCase(imageRepo, queue);

    await useCase.execute(PAYLOAD);

    expect(imageRepo.findSeenUrls).toHaveBeenCalledOnce();
    expect(queue.publish).toHaveBeenCalledWith('process-media', {
      providerId: PAYLOAD.providerId,
      imageUrls: PAYLOAD.imageUrls,
      source: PAYLOAD.source,
      vertical: PAYLOAD.vertical,
    });
  });

  it('should skip seen images and only publish unseen ones', async () => {
    const queue = makeQueue();
    const imageRepo = makeImageRepo();
    // La primera imagen ya se vio (87377d28954007c34344dc8795ac59c6a2f64f81b10395ae9695501204c33607), la segunda no
    imageRepo.findSeenUrls.mockResolvedValue([
      '87377d28954007c34344dc8795ac59c6a2f64f81b10395ae9695501204c33607',
    ]);

    const useCase = new ProcessImagesUseCase(imageRepo, queue);

    await useCase.execute(PAYLOAD);

    expect(queue.publish).toHaveBeenCalledWith('process-media', {
      providerId: PAYLOAD.providerId,
      imageUrls: ['https://src.com/img2.jpg'],
      source: PAYLOAD.source,
      vertical: PAYLOAD.vertical,
    });
  });

  it('should not publish anything if all images are already seen', async () => {
    const queue = makeQueue();
    const imageRepo = makeImageRepo();
    imageRepo.findSeenUrls.mockResolvedValue([
      '87377d28954007c34344dc8795ac59c6a2f64f81b10395ae9695501204c33607',
      '8da55bafc0861cad295e1108f6aa71ac3c2ff01ffdcdaf801efe194123396bfb', // Correct sha256 for img2
    ]);

    const useCase = new ProcessImagesUseCase(imageRepo, queue);

    await useCase.execute(PAYLOAD);

    expect(queue.publish).not.toHaveBeenCalled();
  });
});
