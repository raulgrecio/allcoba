import { Buffer } from 'buffer';

import { Email, ImageHash, Phone, Price, valueOrUndefined } from '@allcoba/legacy-domain';
import { logger } from '@allcoba/kernel';

import type { ImageHasherPort } from '#application/ports/image-hasher.port.js';
import type { ProviderRepositoryPort } from '#application/ports/repository.port.js';
import type { SourceResolverPort } from '#application/ports/source-resolver.port.js';
import type { RawExtraction } from '#application/ports/source.port.js';
import type { StoragePort } from '#application/ports/storage.port.js';
import type { ScrapedImage, SocialContact } from '#domain/aggregates/scraped-provider.aggregate.js';
import type { ConsolidationService } from '#domain/services/consolidation.service.js';
import { ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.js';
import { ScrapedProvider } from '#domain/aggregates/scraped-provider.aggregate.js';
import { VerificationStatus } from '#domain/entities/verification-status.js';
import { Vertical } from '#domain/entities/vertical.js';
import { ExternalId } from '#domain/value-objects/external-id.vo.js';
import { ScrapedLocation } from '#domain/value-objects/scraped-location.vo.js';

export interface ScraperConfig {
  headless?: boolean;
  maxImagesToProcess?: number;
  saveDebugSnapshots?: boolean;
  saveRawHtml?: boolean;
  skipInteractions?: boolean;
  captureNetworkLogs?: boolean;
  manualPause?: boolean;
  skipRobots?: boolean;
  blockImages?: boolean;
  proxyStrategy?: ProxyStrategy;
  solverStrategy?: SolverStrategy;
}

const DEFAULT_CONFIG: ScraperConfig = {
  maxImagesToProcess: 20,
  saveRawHtml: false,
  saveDebugSnapshots: false,
  skipInteractions: false,
  captureNetworkLogs: false,
  skipRobots: false,
  proxyStrategy: ProxyStrategy.NONE,
  solverStrategy: SolverStrategy.NONE,
};

interface ParsedRaw {
  externalId: ExternalId;
  phones: readonly Phone[];
  email: Email | undefined;
  contacts: readonly SocialContact[];
  price: Price | undefined;
  location: ScrapedLocation | undefined;
}

export class ScrapeUrlUseCase {
  private readonly logger = logger().child({ component: ScrapeUrlUseCase.name });

  constructor(
    private readonly sourceResolver: SourceResolverPort,
    private readonly repository: ProviderRepositoryPort,
    private readonly consolidationService: ConsolidationService,
    private readonly imageHasher: ImageHasherPort,
    private readonly storage: StoragePort,
    private readonly config: ScraperConfig = DEFAULT_CONFIG,
  ) {}

  async execute(url: string): Promise<void> {
    const source = await this.sourceResolver.resolve(url);

    if (!this.config.skipRobots && !(await source.isAllowed(url)))
      throw new Error(`robots.txt blocks: ${url}`);

    const domain = new URL(url).hostname.replace('www.', '');
    const baseRawPath = `raw/${domain}`;

    const {
      data: raw,
      html,
      networkResponses,
    } = await source.extract(url, {
      headless: this.config.headless,
      skipInteractions: this.config.skipInteractions,
      captureNetwork: this.config.captureNetworkLogs,
      manualPause: this.config.manualPause,
      blockImages: this.config.blockImages,
      proxyStrategy: this.config.proxyStrategy,
      solverStrategy: this.config.solverStrategy,
      onSnapshot: async (snapshotHtml, stage) => {
        if (!this.config.saveRawHtml || !this.config.saveDebugSnapshots) return;

        const fullHash = Buffer.from(url)
          .toString('base64')
          .replace(/[^a-z0-9]/gi, '');
        const urlHash = fullHash.substring(0, 4) + fullHash.substring(fullHash.length - 8);
        const urlSlug =
          url
            .split('/')
            .filter(Boolean)
            .pop()
            ?.replace(/[^a-z0-9]/gi, '_') ?? 'unknown';

        const slug = `${urlSlug}_${urlHash}`;

        await this.storage.upload(
          Buffer.from(snapshotHtml),
          `${baseRawPath}/${source.identifier}_${slug}_${stage}_debug.html`,
          'text/html',
        );
      },
    });

    if (this.config.saveRawHtml) {
      const slug = raw.externalId.replace(/[^a-z0-9]/gi, '_');
      await this.storage
        .upload(Buffer.from(html), `${baseRawPath}/${raw.source}_${slug}.html`, 'text/html')
        .then(
          () => {
            raw.metadata.debugFile = `${domain}/${raw.source}_${slug}.html`;
          },
          () => {
            this.logger.warn('Could not persist debug HTML');
          },
        );
    }

    // Guardar respuestas de red si están disponibles (independiente de saveRawHtml)
    if (this.config.captureNetworkLogs && networkResponses && networkResponses.length > 0) {
      const slug = raw.externalId.replace(/[^a-z0-9]/gi, '_');
      raw.metadata.networkFiles = [];
      await Promise.all(
        networkResponses.map(async (res, i) => {
          try {
            const resSlug = new URL(res.url).pathname
              .split('/')
              .filter(Boolean)
              .pop()
              ?.replace(/[^a-z0-9]/gi, '_');
            const fileName = `${baseRawPath}/network/${raw.source}_${slug}_${i}_${resSlug}.json`;
            await this.storage.upload(Buffer.from(res.body), fileName, 'application/json');
            raw.metadata.networkFiles?.push(fileName);
          } catch (e) {
            // Ignorar errores en archivos individuales
          }
        }),
      );
      this.logger.info(
        { count: networkResponses.length },
        'Respuestas de red capturadas y guardadas',
      );
    }

    // Convert raw strings → validated VOs. Invalid externalId → skip whole extraction.
    const parsed = this.parseRaw(raw);
    if (!parsed) return;

    this.logger.info(
      { imageUrlsCount: raw.imageUrls.length, source: raw.source, key: parsed.externalId.key },
      'Processing images',
    );

    const processedImages = await this.processImages({
      imageUrls: raw.imageUrls,
      externalId: raw.externalId,
      source: raw.source,
      vertical: raw.vertical,
    });

    const candidates = await this.repository.find({
      vertical: raw.vertical,
      phone: parsed.phones[0],
      email: parsed.email,
      contact: parsed.contacts[0],
      externalId: parsed.externalId,
    });

    const result = this.consolidationService.consolidate({
      phones: parsed.phones,
      contacts: parsed.contacts,
      email: parsed.email,
      externalId: parsed.externalId,
      coordinates: parsed.location?.coordinates ?? raw.location.coordinates,
      candidates,
    });

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
          email: parsed.email,
          contacts: parsed.contacts,
          location: parsed.location,
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
            email: parsed.email,
            contacts: parsed.contacts,
            location: parsed.location,
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

    const email = valueOrUndefined(Email.create(raw.email));
    if (raw.email && !email) {
      this.logger.debug({ raw: raw.email }, 'Skipping invalid email');
    }

    const contacts: SocialContact[] = raw.contacts ?? [];

    const price = valueOrUndefined(Price.create(raw.price, raw.currency));
    const location = valueOrUndefined(ScrapedLocation.create(raw.location));

    return {
      externalId: externalIdResult.value,
      phones,
      email,
      contacts,
      price,
      location,
    };
  }

  private async processImages({
    imageUrls,
    externalId,
    source,
    vertical,
  }: {
    imageUrls: string[];
    externalId: string;
    source: string;
    vertical: Vertical;
  }): Promise<ScrapedImage[]> {
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

          const existing = await this.repository.find({
            vertical,
            imageHash: hashResult.value,
          });
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
            `images/${source}/${slug}/${String(i).padStart(3, '0')}.jpg`,
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
