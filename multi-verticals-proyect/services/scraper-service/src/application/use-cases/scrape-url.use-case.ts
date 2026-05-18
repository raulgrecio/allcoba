import { Buffer } from 'buffer';

import type { Vertical } from '@allcoba/shared-types';
import { asImageHash, asPhoneE164 } from '@allcoba/shared-types';
import { logger } from '@allcoba/kernel';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.js';
import {
  isDatingPipelinePort,
  type DatingPipelinePort,
} from '#application/ports/dating-pipeline.port.js';
import type { ImageHasherPort } from '#application/ports/image-hasher.port.js';
import type { ProviderRepositoryPort } from '#application/ports/repository.port.js';
import {
  isScrapingPipelinePort,
  type AnyPipelinePort,
} from '#application/ports/scraping-pipeline.port.js';
import type { SourceResolverPort } from '#application/ports/source-resolver.port.js';
import type { RawExtraction, SourcePort } from '#application/ports/source.port.js';
import type { StoragePort } from '#application/ports/storage.port.js';
import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import { asConfidence, Confidence } from '#domain/canonical/confidence.js';
import type { ProfileImage } from '#domain/canonical/profile-image.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { mergeProvider } from '#domain/services/canonical/merge-provider.js';
import type { ConsolidationService } from '#domain/services/canonical/consolidation.service.js';

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

export class ScrapeUrlUseCase {
  private readonly log = logger().child({ component: 'ScrapeUrlUseCase' });

  constructor(
    private readonly sourceResolver: SourceResolverPort,
    private readonly repository: ProviderRepositoryPort,
    private readonly consolidationService: ConsolidationService,
    private readonly imageHasher: ImageHasherPort,
    private readonly storage: StoragePort,
    private readonly crawler: CrawlerPort,
    private readonly taxonomyResolver: TaxonomyResolverPort,
    private readonly config: ScraperConfig = DEFAULT_CONFIG,
  ) {}

  async execute(url: string): Promise<void> {
    const source = await this.sourceResolver.resolve(url);
    if (isDatingPipelinePort(source)) {
      await this.executeV2(source, url);
      return;
    }
    if (isScrapingPipelinePort(source)) {
      // real-estate / motor / general v2 path — extract + map but defer
      // persistence until a vertical-specific repository lands.
      await this.executeV2NonDating(source, url);
      return;
    }
    await this.executeV1(source as SourcePort, url);
  }

  // ── v2 path — non-dating (Property / Vehicle / Listing) ──────────────────
  // Extract + map run end-to-end; the resulting ScrapedProperty / ScrapedVehicle
  // / ScrapedListing is logged but not persisted yet — the dating-only
  // ProviderRepositoryPort cannot store it. Wire a per-vertical repository to
  // close the loop.

  private async executeV2NonDating(pipeline: AnyPipelinePort, url: string): Promise<void> {
    if (!this.config.skipRobots && !(await pipeline.isAllowed(url))) {
      throw new Error(`robots.txt blocks: ${url}`);
    }
    const crawlerOptions = pipeline.getCrawlerOptions(url, {
      headless: this.config.headless,
      skipInteractions: this.config.skipInteractions,
      captureNetwork: this.config.captureNetworkLogs,
      manualPause: this.config.manualPause,
      blockImages: this.config.blockImages,
      proxyStrategy: this.config.proxyStrategy,
      solverStrategy: this.config.solverStrategy,
    });
    const result = await this.crawler.fetch(url, crawlerOptions);
    const payload = pipeline.extract(result.html, url);
    const scraped = await pipeline.map(payload, this.taxonomyResolver);
    this.log.info(
      { source: pipeline.identifier, vertical: pipeline.defaultVertical, scraped },
      'V2 non-dating extraction (persistence pending)',
    );
  }

  // ── v2 path — DatingPipelinePort ───────────────────────────────────────────

  private async executeV2(pipeline: DatingPipelinePort, url: string): Promise<void> {
    if (!this.config.skipRobots && !(await pipeline.isAllowed(url))) {
      throw new Error(`robots.txt blocks: ${url}`);
    }

    const crawlerOptions = pipeline.getCrawlerOptions(url, {
      headless: this.config.headless,
      skipInteractions: this.config.skipInteractions,
      captureNetwork: this.config.captureNetworkLogs,
      manualPause: this.config.manualPause,
      blockImages: this.config.blockImages,
      proxyStrategy: this.config.proxyStrategy,
      solverStrategy: this.config.solverStrategy,
    });

    const result = await this.crawler.fetch(url, crawlerOptions);
    const payload = pipeline.extract(result.html, url);
    const scraped = await pipeline.map(payload, this.taxonomyResolver);

    const externalRef = scraped.externalRefs[0];
    if (!externalRef) {
      this.log.error({ url, source: pipeline.identifier }, 'V2 pipeline returned no externalRef');
      return;
    }
    const phones = scraped.phoneNumber ? [scraped.phoneNumber] : [];

    const candidates = await this.repository.find({
      vertical: scraped.vertical,
      phoneNumber: phones[0],
      externalRef,
    });

    const consolidation = this.consolidationService.consolidate({
      phones,
      externalRef,
      candidates,
    });

    this.log.info(
      {
        source: pipeline.identifier,
        action: consolidation.action,
        signals: consolidation.signals.map((s) => s.type),
      },
      'V2 consolidation result',
    );

    const now = new Date().toISOString();
    const processedImages = await this.processImages({
      imageUrls: scraped.photos.map((p) => p.url),
      externalId: externalRef.sourceId,
      source: pipeline.identifier,
      vertical: scraped.vertical,
    });

    const enriched: ScrapedProvider = {
      ...scraped,
      confidence: consolidation.confidence,
      signals: [...consolidation.signals],
      images: processedImages,
      lastScrapedAt: now,
    };

    switch (consolidation.action) {
      case 'CREATE':
        await this.repository.create(enriched);
        this.log.info({ id: enriched.id }, 'V2 provider created');
        break;
      case 'MERGE':
      case 'FLAG_FOR_REVIEW':
        if (consolidation.target) {
          const patch: Partial<ScrapedProvider> = {
            phoneNumber: phones[0],
            images: processedImages,
            externalRefs: [externalRef],
            confidence: consolidation.confidence,
            verificationStatus:
              consolidation.action === 'FLAG_FOR_REVIEW'
                ? 'pending_review'
                : consolidation.target.verificationStatus,
            signals: [...consolidation.signals],
            attributes: enriched.attributes,
            metadata: enriched.metadata,
            lastScrapedAt: now,
          };
          const merged = mergeProvider(consolidation.target, patch);
          await this.repository.update(merged.id, merged);
          this.log.info({ id: merged.id, action: consolidation.action }, 'V2 provider updated');
        }
        break;
      case 'IGNORE':
        this.log.info('V2 extraction ignored');
        break;
    }
  }

  // ── v1 path — legacy SourcePort (motor / real-estate / general) ────────────

  private async executeV1(source: SourcePort, url: string): Promise<void> {
    if (!this.config.skipRobots && !(await source.isAllowed(url))) {
      throw new Error(`robots.txt blocks: ${url}`);
    }

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

        await this.storage.upload(
          Buffer.from(snapshotHtml),
          `${baseRawPath}/${source.identifier}_${urlSlug}_${urlHash}_${stage}_debug.html`,
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
            this.log.warn('Could not persist debug HTML');
          },
        );
    }

    if (this.config.captureNetworkLogs && networkResponses?.length) {
      const slug = raw.externalId.replace(/[^a-z0-9]/gi, '_');
      raw.metadata.networkFiles = [];
      await Promise.all(
        networkResponses.map(async (res, i) => {
          try {
            const resSlug = new URL(res.url)
              .pathname.split('/')
              .filter(Boolean)
              .pop()
              ?.replace(/[^a-z0-9]/gi, '_');
            const fileName = `${baseRawPath}/network/${raw.source}_${slug}_${i}_${resSlug}.json`;
            await this.storage.upload(Buffer.from(res.body), fileName, 'application/json');
            raw.metadata.networkFiles?.push(fileName);
          } catch {
            /* ignore per-file errors */
          }
        }),
      );
      this.log.info({ count: networkResponses.length }, 'Network responses captured');
    }

    const externalRef = { source: raw.source, sourceId: raw.externalId, sourceUrl: raw.url };

    const processedImages = await this.processImages({
      imageUrls: raw.imageUrls,
      externalId: raw.externalId,
      source: raw.source,
      vertical: raw.vertical,
    });

    const phones = raw.phones
      .map((p) => {
        try {
          return asPhoneE164(p);
        } catch {
          return null;
        }
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    const candidates = await this.repository.find({
      vertical: raw.vertical,
      phoneNumber: phones[0],
      externalRef,
    });

    const result = this.consolidationService.consolidate({
      phones,
      externalRef,
      candidates,
    });

    this.log.info(
      { action: result.action, signals: result.signals.map((s) => s.type) },
      'Consolidation result',
    );

    const now = new Date().toISOString();

    switch (result.action) {
      case 'CREATE': {
        const provider = buildMinimalScrapedProvider({
          raw,
          images: processedImages,
          externalRef,
          confidence: result.confidence,
          signals: [...result.signals],
          now,
        });
        await this.repository.create(provider);
        this.log.info({ id: provider.id }, 'Provider created');
        break;
      }
      case 'MERGE':
      case 'FLAG_FOR_REVIEW': {
        if (result.target) {
          const patch: Partial<ScrapedProvider> = {
            phoneNumber: phones[0],
            images: processedImages,
            externalRefs: [externalRef],
            confidence: result.confidence,
            verificationStatus:
              result.action === 'FLAG_FOR_REVIEW'
                ? 'pending_review'
                : result.target.verificationStatus,
            signals: [...result.signals],
            attributes: raw.attributes as Record<string, unknown>,
            metadata: raw.metadata as Record<string, unknown>,
            lastScrapedAt: now,
          };
          const merged = mergeProvider(result.target, patch);
          await this.repository.update(merged.id, merged);
          this.log.info({ id: merged.id, action: result.action }, 'Provider updated');
        }
        break;
      }
      case 'IGNORE':
        this.log.info('Extraction ignored');
        break;
    }
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
  }): Promise<ProfileImage[]> {
    const results = await Promise.all(
      imageUrls.slice(0, this.config.maxImagesToProcess).map(async (imgUrl, i) => {
        try {
          const response = await fetch(imgUrl);
          const buffer = Buffer.from(await response.arrayBuffer());

          const rawHash = await this.imageHasher.generateHash(buffer);
          const hash = asImageHash(rawHash);

          const existing = await this.repository.find({ vertical, imageHash: hash });
          if (existing.length > 0) {
            const existingImg = existing[0]!.images.find((img) => img.hash === hash);
            if (existingImg) {
              return { hash, storedUrl: existingImg.storedUrl, originalUrl: imgUrl };
            }
          }

          const slug = externalId.replace(/[^a-z0-9]/gi, '_');
          const storedUrl = await this.storage.upload(
            buffer,
            `images/${source}/${slug}/${String(i).padStart(3, '0')}.jpg`,
            'image/jpeg',
          );

          return { hash, storedUrl, originalUrl: imgUrl };
        } catch (error) {
          this.log.error({ imgUrl, error }, 'Error processing image');
          return null;
        }
      }),
    );

    return results.filter((r): r is ProfileImage => r !== null);
  }
}

// ── factory helper (v1 path only) ─────────────────────────────────────────────

function buildMinimalScrapedProvider({
  raw,
  images,
  externalRef,
  confidence,
  signals,
  now,
}: {
  raw: RawExtraction;
  images: readonly ProfileImage[];
  externalRef: { source: string; sourceId: string; sourceUrl?: string };
  confidence: ReturnType<typeof asConfidence>;
  signals: ScrapedProvider['signals'];
  now: string;
}): ScrapedProvider {
  const phones = raw.phones
    .map((p) => {
      try {
        return asPhoneE164(p);
      } catch {
        return null;
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return {
    id: crypto.randomUUID() as ScrapedProvider['id'],
    vertical: raw.vertical,
    nickname: raw.name ?? '',
    active: true,
    humanVerified: false,
    badges: { verified: false, trans: false, vip: false, pornstar: false },
    verificationStatus: 'pending_review',
    meetingPlaces: { incall: false, outcall: false },
    contactOptions: (raw.contacts?.map((c) => c.platform).filter((p) =>
      ['calls', 'sms', 'whatsapp', 'telegram'].includes(p),
    ) ?? []) as ScrapedProvider['contactOptions'],
    personalDetails: {
      ageYears: 0,
      spokenLanguageCodes: [],
      meetingWith: [],
    },
    prices:
      raw.price != null
        ? [
            {
              slot: 'h1' as const,
              amount: raw.price,
              currency: (raw.currency ?? 'EUR') as ScrapedProvider['prices'][number]['currency'],
            },
          ]
        : [],
    photos: [],
    phoneNumber: phones[0],
    links: {},
    otherPlatforms: [],
    reviewsEnabled: true,
    reviewsCount: 0,
    reviewsRating: 0,
    reviews: [],
    tours: [],
    createdAt: now,
    updatedAt: now,
    externalRefs: [externalRef],
    signals,
    confidence,
    images,
    attributes: raw.attributes as Record<string, unknown>,
    metadata: raw.metadata as Record<string, unknown>,
    lastScrapedAt: now,
  };
}

// Re-export Confidence so DI containers can pass defaults if needed.
export { Confidence };
