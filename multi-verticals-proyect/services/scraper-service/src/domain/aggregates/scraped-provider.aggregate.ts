import type { Email, ImageHash, Phone, Price } from '@allcoba/legacy-domain';
import { ProviderId } from '@allcoba/legacy-domain';

import type { ContactPlatform } from '../entities/contact-platform.js';
import type { Vertical } from '../entities/vertical.js';
import type { ConfidenceScore } from '../value-objects/confidence-score.vo.js';
import type { ExternalId } from '../value-objects/external-id.vo.js';
import type { ScrapedLocation } from '../value-objects/scraped-location.vo.js';
import { VerificationStatus } from '../entities/verification-status.js';

export interface SocialContact {
  platform: ContactPlatform;
  handle: string;
}

export type SignalType =
  | 'IMAGE_MATCH'
  | 'TEXT_SIMILARITY'
  | 'PHONE_MATCH'
  | 'EMAIL_MATCH'
  | 'LOCATION_MATCH'
  | 'CONTACT_MATCH'
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
  email?: Email;
  contacts?: readonly SocialContact[];
  location?: ScrapedLocation;
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
  email: Email;
  contacts: readonly SocialContact[];
  location: ScrapedLocation;
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

type ScrapedProviderState = {
  id: ProviderId;
  displayName: string | undefined;
  phones: readonly Phone[];
  email: Email | undefined;
  contacts: readonly SocialContact[];
  location: ScrapedLocation | undefined;
  description: string | undefined;
  price: Price | undefined;
  images: readonly ScrapedImage[];
  vertical: Vertical;
  externalIds: readonly ExternalId[];
  verificationStatus: VerificationStatus;
  confidenceScore: ConfidenceScore;
  signals: readonly ScraperSignal[];
  attributes: Record<string, unknown>;
  metadata: Record<string, unknown>;
  lastScrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Aggregate root for a scraped provider entity.
 * Immutable — state changes return new instances via merge().
 */
export class ScrapedProvider {
  public readonly id: ProviderId;
  public readonly displayName: string | undefined;
  public readonly phones: readonly Phone[];
  public readonly email: Email | undefined;
  public readonly contacts: readonly SocialContact[];
  public readonly location: ScrapedLocation | undefined;
  public readonly description: string | undefined;
  public readonly price: Price | undefined;
  public readonly images: readonly ScrapedImage[];
  public readonly vertical: Vertical;
  public readonly externalIds: readonly ExternalId[];
  public readonly verificationStatus: VerificationStatus;
  public readonly confidenceScore: ConfidenceScore;
  public readonly signals: readonly ScraperSignal[];
  public readonly attributes: Record<string, unknown>;
  public readonly metadata: Record<string, unknown>;
  public readonly lastScrapedAt: Date;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  private constructor(state: ScrapedProviderState) {
    this.id = state.id;
    this.displayName = state.displayName;
    this.phones = state.phones;
    this.email = state.email;
    this.contacts = state.contacts;
    this.location = state.location;
    this.description = state.description;
    this.price = state.price;
    this.images = state.images;
    this.vertical = state.vertical;
    this.externalIds = state.externalIds;
    this.verificationStatus = state.verificationStatus;
    this.confidenceScore = state.confidenceScore;
    this.signals = state.signals;
    this.attributes = state.attributes;
    this.metadata = state.metadata;
    this.lastScrapedAt = state.lastScrapedAt;
    this.createdAt = state.createdAt;
    this.updatedAt = state.updatedAt;
  }

  static create(props: CreateScrapedProviderProps): ScrapedProvider {
    const now = new Date();
    return new ScrapedProvider({
      id: props.id ?? ProviderId.generate(),
      displayName: props.displayName,
      phones: props.phones ?? [],
      email: props.email,
      contacts: props.contacts ?? [],
      location: props.location,
      description: props.description,
      price: props.price,
      images: props.images ?? [],
      vertical: props.vertical,
      externalIds: props.externalIds ?? [],
      verificationStatus: props.verificationStatus ?? VerificationStatus.PENDING_REVIEW,
      confidenceScore: props.confidenceScore,
      signals: props.signals ?? [],
      attributes: props.attributes ?? {},
      metadata: props.metadata ?? {},
      lastScrapedAt: props.lastScrapedAt ?? now,
      createdAt: props.createdAt ?? now,
      updatedAt: props.updatedAt ?? now,
    });
  }

  hasPhone(phone: Phone): boolean {
    return this.phones.some((p) => p.equals(phone));
  }

  hasContact(platform: ContactPlatform, handle: string): boolean {
    const h = handle.toLowerCase();
    return this.contacts.some((c) => c.platform === platform && c.handle.toLowerCase() === h);
  }

  findContact(platform: ContactPlatform): SocialContact | undefined {
    return this.contacts.find((c) => c.platform === platform);
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

  merge(updates: MergeProps): ScrapedProvider {
    const now = new Date();

    const mergedPhones = updates.phones
      ? [...this.phones, ...updates.phones.filter((p) => !this.hasPhone(p))]
      : this.phones;

    const mergedContacts = updates.contacts
      ? [
          ...this.contacts,
          ...updates.contacts.filter((c) => !this.hasContact(c.platform, c.handle)),
        ]
      : this.contacts;

    const mergedImages = updates.images
      ? [...this.images, ...updates.images.filter((img) => !this.hasImageHash(img.hash))]
      : this.images;

    const mergedExternalIds = updates.externalIds
      ? [...this.externalIds, ...updates.externalIds.filter((e) => !this.hasExternalId(e))]
      : this.externalIds;

    return new ScrapedProvider({
      id: this.id,
      displayName: this.displayName,
      phones: mergedPhones,
      email: this.email ?? updates.email,
      contacts: mergedContacts,
      location: this.location ?? updates.location,
      description: this.description ?? updates.description,
      price: updates.price ?? this.price,
      images: mergedImages,
      vertical: this.vertical,
      externalIds: mergedExternalIds,
      verificationStatus: updates.verificationStatus ?? this.verificationStatus,
      confidenceScore: updates.confidenceScore ?? this.confidenceScore,
      signals: updates.signals ? [...this.signals, ...updates.signals] : this.signals,
      attributes: { ...this.attributes, ...updates.attributes },
      metadata: { ...this.metadata, ...updates.metadata, lastMergedAt: now.toISOString() },
      lastScrapedAt: now,
      createdAt: this.createdAt,
      updatedAt: now,
    });
  }
}
