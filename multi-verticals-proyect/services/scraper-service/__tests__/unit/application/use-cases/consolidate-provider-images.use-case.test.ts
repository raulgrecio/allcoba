import { describe, expect, it, vi } from 'vitest';

import { asImageHash, asProviderId } from '@allcoba/shared-types';

import type { ProviderRepositoryPort } from '#application/ports/repository.port.js';
import type { ScrapedImageRepositoryPort } from '#application/ports/scraped-image-repository.port.js';
import { ConsolidateProviderImagesUseCase } from '#application/use-cases/consolidate-provider-images.use-case.js';

import { buildProvider } from '../../helpers/scraped-provider.builder.js';

const PAYLOAD = {
  providerId: 'provider-123',
  vertical: 'dating' as const,
  images: [
    {
      originalUrl: 'https://src.com/img1.jpg',
      storedUrl: 'https://r2.example.com/img1.webp',
      hash: 'abc123phash',
    },
  ],
};

type FakeRepo = ProviderRepositoryPort & {
  findById: ReturnType<typeof vi.fn>;
  updateById: ReturnType<typeof vi.fn>;
};

const makeRepo = (): FakeRepo =>
  ({
    findById: vi.fn().mockResolvedValue(null),
    updateById: vi.fn().mockResolvedValue(undefined),
  }) as unknown as FakeRepo;

type FakeImageRepo = ScrapedImageRepositoryPort & {
  markSeen: ReturnType<typeof vi.fn>;
};

const makeImageRepo = (): FakeImageRepo =>
  ({
    hasUrl: vi.fn().mockResolvedValue(false),
    findSeenUrls: vi.fn().mockResolvedValue([]),
    markSeen: vi.fn().mockResolvedValue(undefined),
  }) as unknown as FakeImageRepo;

describe('ConsolidateProviderImagesUseCase', () => {
  it('should skip if provider is not found', async () => {
    const repo = makeRepo();
    const imageRepo = makeImageRepo();
    const useCase = new ConsolidateProviderImagesUseCase(repo, imageRepo);

    await useCase.execute(PAYLOAD);

    expect(repo.findById).toHaveBeenCalledWith(asProviderId(PAYLOAD.providerId));
    expect(repo.updateById).not.toHaveBeenCalled();
  });

  it('should skip if provider has no external refs', async () => {
    const provider = buildProvider({ id: asProviderId(PAYLOAD.providerId), externalRefs: [] });
    const repo = makeRepo();
    repo.findById.mockResolvedValue(provider);
    const imageRepo = makeImageRepo();
    const useCase = new ConsolidateProviderImagesUseCase(repo, imageRepo);

    await useCase.execute(PAYLOAD);

    expect(repo.updateById).not.toHaveBeenCalled();
  });

  it('should mark seen and update provider database record with images', async () => {
    const provider = buildProvider({ id: asProviderId(PAYLOAD.providerId) });
    const repo = makeRepo();
    repo.findById.mockResolvedValue(provider);
    const imageRepo = makeImageRepo();
    const useCase = new ConsolidateProviderImagesUseCase(repo, imageRepo);

    await useCase.execute(PAYLOAD);

    expect(imageRepo.markSeen).toHaveBeenCalledOnce();
    expect(repo.updateById).toHaveBeenCalledOnce();

    const updatedProvider = repo.updateById.mock.calls[0]![1];
    expect(updatedProvider.images).toEqual([
      {
        hash: asImageHash('abc123phash'),
        storedUrl: 'https://r2.example.com/img1.webp',
        originalUrl: 'https://src.com/img1.jpg',
      },
    ]);
  });
});
