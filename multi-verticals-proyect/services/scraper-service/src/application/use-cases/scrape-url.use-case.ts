import { Buffer } from 'buffer';

import type { Coordinates } from '@allcoba/domain';
import { ImageHash, Phone, Price, Telegram } from '@allcoba/domain';
import { logger } from '@allcoba/kernel';

import type { ScrapedImage } from '../../domain/aggregates/scraped-provider.aggregate.js';
import type { ConsolidationService } from '../../domain/services/consolidation.service.js';
import type { ImageHasherPort } from '../ports/image-hasher.port.js';
import type { ProviderRepositoryPort } from '../ports/repository.port.js';
import type { RawExtraction, SourcePort } from '../ports/source.port.js';
import type { StoragePort } from '../ports/storage.port.js';
import {
  ScrapedProvider,
  VerificationStatus,
} from '../../domain/aggregates/scraped-provider.aggregate.js';
import { ExternalId } from '../../domain/value-objects/external-id.vo.js';
import { ScrapedAddress } from '../../domain/value-objects/scraped-address.vo.js';

export interface ScraperConfig {
  maxImagesToProcess: number;
  saveRawHtml?: boolean;
  headless?: boolean;
}

const DEFAULT_CONFIG: ScraperConfig = {
  maxImagesToProcess: 5,
  saveRawHtml: true,
};

interface ParsedRaw {
  externalId: ExternalId;
  phones: readonly Phone[];
  telegram: Telegram | undefined;
  price: Price | undefined;
  address: ScrapedAddress | undefined;
  coordinates: Coordinates | undefined;
}

export class ScrapeUrlUseCase {
  private readonly logger = logger().child({ component: ScrapeUrlUseCase.name });

  constructor(
    private readonly sources: SourcePort[],
    private readonly repository: ProviderRepositoryPort,
    private readonly consolidationService: ConsolidationService,
    private readonly imageHasher: ImageHasherPort,
    private readonly storage: StoragePort,
    private readonly config: ScraperConfig = DEFAULT_CONFIG,
  ) {}

  async execute(url: string): Promise<void> {
    const source = this.sources.find((s) => s.canHandle(url));
    if (!source) throw new Error(`No adapter for: ${url}`);

    if (!(await source.isAllowed(url))) throw new Error(`robots.txt blocks: ${url}`);

    const { data: raw, html } = await source.extract(url, {
      headless: this.config.headless,
      onSnapshot: async (snapshotHtml, stage) => {
        if (!this.config.saveRawHtml) return;
        const slug =
          url
            .split('/')
            .filter(Boolean)
            .pop()
            ?.replace(/[^a-z0-9]/gi, '_') ?? 'unknown';
        await this.storage.upload(
          Buffer.from(snapshotHtml),
          `raw/debug_${stage}_${source.identifier}_${slug}.html`,
          'text/html',
        );
      },
    });

    if (this.config.saveRawHtml) {
      const slug = raw.externalId.replace(/[^a-z0-9]/gi, '_');
      await this.storage
        .upload(Buffer.from(html), `raw/${raw.source}_${slug}.html`, 'text/html')
        .then(
          () => {
            raw.metadata.debugFile = `${raw.source}_${slug}.html`;
          },
          () => {
            this.logger.warn('Could not persist debug HTML');
          },
        );
    }

    // Convert raw strings → validated VOs. Invalid externalId → skip whole extraction.
    const parsed = this.parseRaw(raw);
    if (!parsed) return;

    this.logger.info(
      { imageUrlsCount: raw.imageUrls.length, source: raw.source, key: parsed.externalId.key },
      'Processing images',
    );

    const processedImages = await this.processImages(raw.imageUrls, raw.externalId, raw.source);

    const candidates = await this.repository.find({
      phone: parsed.phones[0],
      telegram: parsed.telegram,
      externalId: parsed.externalId,
    });

    const result = this.consolidationService.consolidate(
      parsed.phones,
      parsed.telegram,
      parsed.externalId,
      parsed.coordinates,
      candidates,
    );

    this.logger.info(
      {
        action: result.action,
        confidence: result.confidence.value,
        signals: result.signals.map((s) => s.type),
      },
      'Consolidation result',
    );

    switch (result.action) {
      case 'CREATE': {
        const provider = ScrapedProvider.create({
          displayName: raw.name,
          phones: parsed.phones,
          telegram: parsed.telegram,
          address: parsed.address,
          description: raw.description,
          price: parsed.price,
          images: processedImages,
          vertical: raw.vertical,
          externalIds: [parsed.externalId],
          confidenceScore: result.confidence,
          signals: [...result.signals],
          attributes: raw.attributes as Record<string, unknown>,
          metadata: raw.metadata as Record<string, unknown>,
        });
        await this.repository.create(provider);
        this.logger.info({ id: provider.id.value }, 'Provider created');
        break;
      }

      case 'MERGE':
      case 'FLAG_FOR_REVIEW': {
        if (result.target) {
          const merged = result.target.merge({
            phones: parsed.phones,
            telegram: parsed.telegram,
            address: parsed.address,
            description: raw.description,
            price: parsed.price,
            images: processedImages,
            externalIds: [parsed.externalId],
            confidenceScore: result.confidence,
            verificationStatus:
              result.action === 'FLAG_FOR_REVIEW'
                ? VerificationStatus.PENDING_REVIEW
                : result.target.verificationStatus,
            signals: [...result.signals],
            attributes: raw.attributes as Record<string, unknown>,
            metadata: raw.metadata as Record<string, unknown>,
          });
          await this.repository.update(merged.id, merged);
          this.logger.info({ id: merged.id.value, action: result.action }, 'Provider updated');
        }
        break;
      }

      case 'IGNORE':
        this.logger.info('Extraction ignored');
        break;
    }
  }

  /**
   * Converts raw primitives from the source adapter into validated domain VOs.
   * Invalid phones and telegrams are skipped with a debug log.
   * Returns null only when the externalId itself is invalid (critical — skip extraction).
   */
  private parseRaw(raw: RawExtraction): ParsedRaw | null {
    const externalIdResult = ExternalId.create(raw.source, raw.externalId);
    if (!externalIdResult.success) {
      this.logger.warn(
        { source: raw.source, externalId: raw.externalId },
        'Invalid externalId, skipping extraction',
      );
      return null;
    }

    const phones: Phone[] = [];
    for (const p of raw.phones) {
      const r = Phone.create(p);
      if (r.success) phones.push(r.value);
      else this.logger.debug({ raw: p }, 'Skipping invalid phone');
    }

    const telegramResult = raw.telegram ? Telegram.create(raw.telegram) : null;
    const telegram = telegramResult?.success ? telegramResult.value : undefined;

    const priceResult = raw.price != null ? Price.create(raw.price, raw.currency ?? 'EUR') : null;
    const price = priceResult?.success ? priceResult.value : undefined;

    const addressResult = raw.address ? ScrapedAddress.create(raw.address, raw.coordinates) : null;
    const address = addressResult?.success ? addressResult.value : undefined;

    return {
      externalId: externalIdResult.value,
      phones,
      telegram,
      price,
      address,
      coordinates: raw.coordinates,
    };
  }

  private async processImages(
    imageUrls: string[],
    externalId: string,
    source: string,
  ): Promise<ScrapedImage[]> {
    const results = await Promise.all(
      imageUrls.slice(0, this.config.maxImagesToProcess).map(async (imgUrl, i) => {
        try {
          const response = await fetch(imgUrl);
          const buffer = Buffer.from(await response.arrayBuffer());

          const rawHash = await this.imageHasher.generateHash(buffer);
          const hashResult = ImageHash.create(rawHash);
          if (!hashResult.success) {
            this.logger.warn({ rawHash }, 'Invalid image hash format, skipping');
            return null;
          }

          const existing = await this.repository.find({ imageHash: hashResult.value });
          if (existing.length > 0) {
            const existingImg = existing[0]!.images.find((img) =>
              img.hash.equals(hashResult.value),
            );
            if (existingImg) {
              return {
                hash: hashResult.value,
                storedUrl: existingImg.storedUrl,
                originalUrl: imgUrl,
              };
            }
          }

          const slug = externalId.replace(/[^a-z0-9]/gi, '_');
          const storedUrl = await this.storage.upload(
            buffer,
            `${source}_${slug}_${i}.jpg`,
            'image/jpeg',
          );

          return { hash: hashResult.value, storedUrl, originalUrl: imgUrl };
        } catch (error) {
          this.logger.error({ imgUrl, error }, 'Error processing image');
          return null;
        }
      }),
    );

    return results.filter((r): r is ScrapedImage => r !== null);
  }
}
