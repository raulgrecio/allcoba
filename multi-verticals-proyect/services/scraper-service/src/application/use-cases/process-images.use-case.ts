import { createHash } from 'crypto';

import type { Vertical } from '@allcoba/shared-types';
import { logger } from '@allcoba/kernel';
import { JOB_NAMES } from '@allcoba/shared-types';

import type { QueuePort } from '#application/ports/queue.port.js';
import type { ScrapedImageRepositoryPort } from '#application/ports/scraped-image-repository.port.js';

export interface ProcessImagesJobPayload {
  readonly providerId: string;
  readonly imageUrls: string[];
  readonly source: string;
  readonly vertical: Vertical;
}

export interface ProcessImagesConfig {
  readonly maxImagesToProcess?: number;
}

const DEFAULT_CONFIG: Required<ProcessImagesConfig> = {
  maxImagesToProcess: 20,
};

export class ProcessImagesUseCase {
  private readonly log = logger().child({ component: 'ProcessImagesUseCase' });
  private readonly cfg: Required<ProcessImagesConfig>;

  constructor(
    private readonly imageRepo: ScrapedImageRepositoryPort,
    private readonly queue: QueuePort,
    config: ProcessImagesConfig = {},
  ) {
    this.cfg = { ...DEFAULT_CONFIG, ...config };
  }

  async execute(payload: ProcessImagesJobPayload): Promise<void> {
    this.log.info(
      { providerId: payload.providerId, imageCount: payload.imageUrls.length },
      'Filtering provider images and delegating to media-service',
    );

    const urlsToFilter = payload.imageUrls.slice(0, this.cfg.maxImagesToProcess);

    const urlHashPairs = urlsToFilter.map((imgUrl) => ({
      imgUrl,
      urlHash: createHash('sha256').update(imgUrl).digest('hex'),
    }));

    const urlHashes = urlHashPairs.map((p) => p.urlHash);
    const seenHashes = new Set(await this.imageRepo.findSeenUrls(urlHashes));

    const unseenUrls: string[] = [];
    for (const pair of urlHashPairs) {
      if (seenHashes.has(pair.urlHash)) {
        this.log.debug({ imgUrl: pair.imgUrl }, 'Image URL already seen — skip');
      } else {
        unseenUrls.push(pair.imgUrl);
      }
    }

    if (unseenUrls.length === 0) {
      this.log.info(
        { providerId: payload.providerId },
        'All images have already been seen/processed',
      );
      return;
    }

    this.log.info(
      { providerId: payload.providerId, unseenCount: unseenUrls.length },
      'Publishing unseen images to media-service processing queue',
    );

    await this.queue.publish(JOB_NAMES.PROCESS_MEDIA, {
      providerId: payload.providerId,
      imageUrls: unseenUrls,
      source: payload.source,
      vertical: payload.vertical,
    });
  }
}
