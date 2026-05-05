import type { ImageHash, Phone, Price, Telegram } from '@allcoba/domain';
import { ProviderId } from '@allcoba/domain';

import type { Vertical } from '../entities/vertical.js';
import type { ConfidenceScore } from '../value-objects/confidence-score.vo.js';
import type { ExternalId } from '../value-objects/external-id.vo.js';
import type { ScrapedAddress } from '../value-objects/scraped-address.vo.js';

export enum VerificationStatus {
  AUTOMATIC_MATCH = 'AUTOMATIC_MATCH',
  PENDING_REVIEW = 'PENDING_REVIEW',
  REJECTED = 'REJECTED',
  VERIFIED_MANUAL = 'VERIFIED_MANUAL',
}

export type SignalType =
  | 'IMAGE_MATCH'
  | 'TEXT_SIMILARITY'
  | 'PHONE_MATCH'
  | 'LOCATION_MATCH'
  | 'TELEGRAM_MATCH'
  | 'EXTERNAL_ID_MATCH';

export interface ScraperSignal {
  type: SignalType;
  /** ExternalId.key format: "source:id" */
  sourceKey: string;
  confidence: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface ScrapedImage {
  storedUrl: string;
  originalUrl: string;
  hash: ImageHash;
}

export interface CreateScrapedProviderProps {
  id?: ProviderId;
  displayName?: string;
  phones?: readonly Phone[];
  telegram?: Telegram;
  address?: ScrapedAddress;
  description?: string;
  price?: Price;
  images?: readonly ScrapedImage[];
  vertical: Vertical;
  externalIds?: readonly ExternalId[];
  verificationStatus?: VerificationStatus;
  confidenceScore: ConfidenceScore;
  signals?: readonly ScraperSignal[];
  attributes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  lastScrapedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export type MergeProps = Partial<{
  phones: readonly Phone[];
  telegram: Telegram;
  address: ScrapedAddress;
  description: string;
  price: Price;
  images: readonly ScrapedImage[];
  externalIds: readonly ExternalId[];
  confidenceScore: ConfidenceScore;
  verificationStatus: VerificationStatus;
  signals: readonly ScraperSignal[];
  attributes: Record<string, unknown>;
  metadata: Record<string, unknown>;
}>;

/**
 * Aggregate root for a scraped provider entity.
 * Immutable — state changes return new instances via merge().
 */
export class ScrapedProvider {
  private constructor(
    public readonly id: ProviderId,
    public readonly displayName: string | undefined,
    public readonly phones: readonly Phone[],
    public readonly telegram: Telegram | undefined,
    public readonly address: ScrapedAddress | undefined,
    public readonly description: string | undefined,
    public readonly price: Price | undefined,
    public readonly images: readonly ScrapedImage[],
    public readonly vertical: Vertical,
    public readonly externalIds: readonly ExternalId[],
    public readonly verificationStatus: VerificationStatus,
    public readonly confidenceScore: ConfidenceScore,
    public readonly signals: readonly ScraperSignal[],
    public readonly attributes: Record<string, unknown>,
    public readonly metadata: Record<string, unknown>,
    public readonly lastScrapedAt: Date,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}

  static create(props: CreateScrapedProviderProps): ScrapedProvider {
    const now = new Date();
    return new ScrapedProvider(
      props.id ?? ProviderId.generate(),
      props.displayName,
      props.phones ?? [],
      props.telegram,
      props.address,
      props.description,
      props.price,
      props.images ?? [],
      props.vertical,
      props.externalIds ?? [],
      props.verificationStatus ?? VerificationStatus.PENDING_REVIEW,
      props.confidenceScore,
      props.signals ?? [],
      props.attributes ?? {},
      props.metadata ?? {},
      props.lastScrapedAt ?? now,
      props.createdAt ?? now,
      props.updatedAt ?? now,
    );
  }

  hasPhone(phone: Phone): boolean {
    return this.phones.some((p) => p.equals(phone));
  }

  hasTelegram(telegram: Telegram): boolean {
    return this.telegram?.equals(telegram) ?? false;
  }

  hasExternalId(externalId: ExternalId): boolean {
    return this.externalIds.some((e) => e.equals(externalId));
  }

  hasImageHash(hash: ImageHash): boolean {
    return this.images.some((img) => img.hash.equals(hash));
  }

  findExternalIdBySource(source: string): ExternalId | undefined {
    return this.externalIds.find((e) => e.source === source);
  }

  /**
   * Returns new instance with merged data.
   * Existing values always win (scraped data never overwrites user-entered data).
   * Exception: price is always updated to latest market data.
   * Collections (phones, images, externalIds, signals) are merged by deduplication.
   */
  merge(updates: MergeProps): ScrapedProvider {
    const now = new Date();

    const mergedPhones = updates.phones
      ? [...this.phones, ...updates.phones.filter((p) => !this.hasPhone(p))]
      : this.phones;

    const mergedImages = updates.images
      ? [...this.images, ...updates.images.filter((img) => !this.hasImageHash(img.hash))]
      : this.images;

    const mergedExternalIds = updates.externalIds
      ? [...this.externalIds, ...updates.externalIds.filter((e) => !this.hasExternalId(e))]
      : this.externalIds;

    return new ScrapedProvider(
      this.id,
      this.displayName,
      mergedPhones,
      this.telegram ?? updates.telegram,
      this.address ?? updates.address,
      this.description ?? updates.description,
      updates.price ?? this.price,
      mergedImages,
      this.vertical,
      mergedExternalIds,
      updates.verificationStatus ?? this.verificationStatus,
      updates.confidenceScore ?? this.confidenceScore,
      updates.signals ? [...this.signals, ...updates.signals] : this.signals,
      { ...this.attributes, ...updates.attributes },
      { ...this.metadata, ...updates.metadata, lastMergedAt: now.toISOString() },
      now, // lastScrapedAt
      this.createdAt, // createdAt
      now, // updatedAt
    );
  }
}
