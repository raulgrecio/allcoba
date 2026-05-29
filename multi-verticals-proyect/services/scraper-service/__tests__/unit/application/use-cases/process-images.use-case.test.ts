import { describe, expect, it, vi } from 'vitest';

import { asImageHash, asProviderId } from '@allcoba/shared-types';

import type { ImagePipelinePort } from '#application/ports/image-pipeline.port.js';
import type { ProviderRepositoryPort } from '#application/ports/repository.port.js';
import type { ScrapedImageRepositoryPort } from '#application/ports/scraped-image-repository.port.js';
import type { StoragePort } from '#application/ports/storage.port.js';
import { ProcessImagesUseCase } from '#application/use-cases/process-images.use-case.js';

import { buildProvider } from '../../helpers/scraped-provider.builder.js';

const PAYLOAD = {
  providerId: 'provider-123',
  imageUrls: ['https://src.com/img.jpg'],
  source: 'topescortbabes',
  vertical: 'dating' as const,
};

type FakeRepo = ProviderRepositoryPort & {
  find: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  findByExternalRef: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  updateById: ReturnType<typeof vi.fn>;
};

const makeRepo = (candidates: ReturnType<typeof buildProvider>[] = []): FakeRepo =>
  ({
    find: vi.fn().mockResolvedValue(candidates),
    findById: vi.fn().mockResolvedValue(null),
    findByExternalRef: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    updateById: vi.fn().mockResolvedValue(undefined),
  }) as unknown as FakeRepo;

type FakeImagePipeline = ImagePipelinePort & { process: ReturnType<typeof vi.fn> };

const makeImagePipeline = (): FakeImagePipeline =>
  ({
    process: vi.fn().mockResolvedValue({
      status: 'ok',
      hashes: {
        sha256: 'sha256hash',
        phash: 'abc123hash',
      },
      metadata: {
        format: 'webp',
        width: 100,
        height: 100,
        size: 1000,
      },
      ocrText: '',
      stegoText: '',
      detected: {
        phones: [],
        emails: [],
        urls: [],
        brands: [],
      },
      flags: {
        isNSFWCandidate: false,
        hasSensitiveData: false,
        hasText: false,
      },
      adapterAssessment: {
        hasInjectedInfo: false,
        injectedInfoTypes: [],
        injectedInfoDetails: [],
      },
      normalizedBuffer: Buffer.from('normalized'),
    }),
  }) as unknown as FakeImagePipeline;

type FakeStorage = StoragePort & {
  upload: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const makeStorage = (): FakeStorage =>
  ({
    upload: vi.fn().mockResolvedValue('https://r2.example.com/img.jpg'),
    delete: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(false),
  }) as unknown as FakeStorage;

type FakeImageRepo = ScrapedImageRepositoryPort & {
  hasUrl: ReturnType<typeof vi.fn>;
  markSeen: ReturnType<typeof vi.fn>;
};

const makeImageRepo = (): FakeImageRepo =>
  ({
    hasUrl: vi.fn().mockResolvedValue(false),
    markSeen: vi.fn().mockResolvedValue(undefined),
  }) as unknown as FakeImageRepo;

describe('ProcessImagesUseCase', () => {
  it('skips if provider is not found', async () => {
    const repo = makeRepo();
    const useCase = new ProcessImagesUseCase(
      repo,
      makeStorage(),
      makeImageRepo(),
      makeImagePipeline(),
    );

    await useCase.execute(PAYLOAD);
    expect(repo.findById).toHaveBeenCalledWith(asProviderId(PAYLOAD.providerId));
    expect(repo.updateById).not.toHaveBeenCalled();
  });

  it('skips if provider has no external refs', async () => {
    const provider = buildProvider({ id: asProviderId(PAYLOAD.providerId), externalRefs: [] });
    const repo = makeRepo();
    repo.findById.mockResolvedValue(provider);
    const useCase = new ProcessImagesUseCase(
      repo,
      makeStorage(),
      makeImageRepo(),
      makeImagePipeline(),
    );

    await useCase.execute(PAYLOAD);
    expect(repo.updateById).not.toHaveBeenCalled();
  });

  it('downloads, hashes, and uploads new images correctly', async () => {
    const provider = buildProvider({ id: asProviderId(PAYLOAD.providerId) });
    const repo = makeRepo();
    repo.findById.mockResolvedValue(provider);
    const storage = makeStorage();
    const useCase = new ProcessImagesUseCase(repo, storage, makeImageRepo(), makeImagePipeline());

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      }),
    );

    await useCase.execute(PAYLOAD);

    expect(storage.upload).toHaveBeenCalledOnce();
    expect(repo.updateById).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('skips image processing if hasUrl returns true', async () => {
    const provider = buildProvider({ id: asProviderId(PAYLOAD.providerId) });
    const repo = makeRepo();
    repo.findById.mockResolvedValue(provider);
    const storage = makeStorage();
    const imageRepo = makeImageRepo();
    imageRepo.hasUrl.mockResolvedValue(true);
    const useCase = new ProcessImagesUseCase(repo, storage, imageRepo, makeImagePipeline());

    await useCase.execute(PAYLOAD);

    expect(storage.upload).not.toHaveBeenCalled();
    expect(repo.updateById).not.toHaveBeenCalled();
  });

  it('reuses existing stored URL on duplicate pHash hit', async () => {
    const provider = buildProvider({ id: asProviderId(PAYLOAD.providerId) });
    const hash = asImageHash('abc123hash');
    const existing = buildProvider({
      images: [
        {
          hash,
          storedUrl: 'https://r2.example.com/existing.jpg',
          originalUrl: 'https://src.com/img.jpg',
        },
      ],
    });
    const repo = makeRepo();
    repo.findById.mockResolvedValue(provider);
    repo.find.mockResolvedValue([existing]);

    const storage = makeStorage();
    const imageRepo = makeImageRepo();
    const useCase = new ProcessImagesUseCase(repo, storage, imageRepo, makeImagePipeline());

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      }),
    );

    await useCase.execute(PAYLOAD);

    expect(storage.upload).not.toHaveBeenCalled();
    expect(imageRepo.markSeen).toHaveBeenCalledOnce();
    expect(repo.updateById).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('handles image fetch error gracefully', async () => {
    const provider = buildProvider({ id: asProviderId(PAYLOAD.providerId) });
    const repo = makeRepo();
    repo.findById.mockResolvedValue(provider);
    const useCase = new ProcessImagesUseCase(
      repo,
      makeStorage(),
      makeImageRepo(),
      makeImagePipeline(),
    );

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')));

    await useCase.execute(PAYLOAD);

    expect(repo.updateById).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('handles non-200 fetch response gracefully', async () => {
    const provider = buildProvider({ id: asProviderId(PAYLOAD.providerId) });
    const repo = makeRepo();
    repo.findById.mockResolvedValue(provider);
    const useCase = new ProcessImagesUseCase(
      repo,
      makeStorage(),
      makeImageRepo(),
      makeImagePipeline(),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      }),
    );

    await useCase.execute(PAYLOAD);

    expect(repo.updateById).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
