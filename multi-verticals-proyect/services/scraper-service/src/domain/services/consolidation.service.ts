import type { Email, Phone } from '@allcoba/domain';
import { logger } from '@allcoba/kernel';

import type {
  ScrapedProvider,
  ScraperSignal,
  SocialContact,
} from '../aggregates/scraped-provider.aggregate.js';
import type { ExternalId } from '../value-objects/external-id.vo.js';
import { ConfidenceScore } from '../value-objects/confidence-score.vo.js';

export type ConsolidationAction = 'CREATE' | 'MERGE' | 'FLAG_FOR_REVIEW' | 'IGNORE';

export interface ConsolidationResult {
  action: ConsolidationAction;
  /** Existing provider to update. Defined when action is MERGE or FLAG_FOR_REVIEW. */
  target?: ScrapedProvider;
  confidence: ConfidenceScore;
  signals: readonly ScraperSignal[];
}

export class ConsolidationService {
  private readonly logger = logger().child({ component: ConsolidationService.name });

  consolidate({
    phones,
    contacts,
    email,
    externalId,
    coordinates,
    candidates,
  }: {
    phones: readonly Phone[];
    contacts: readonly SocialContact[];
    email?: Email;
    externalId: ExternalId;
    coordinates?: { lat: number; lng: number };
    candidates: readonly ScrapedProvider[];
  }): ConsolidationResult {
    this.logger.debug(
      { sourceKey: externalId.key, candidatesCount: candidates.length },
      'Starting consolidation',
    );

    const signals: ScraperSignal[] = [];
    let bestMatch: ScrapedProvider | undefined;
    let maxScore = 0;

    for (const candidate of candidates) {
      const match = this.scoreCandidate({ candidate, phones, contacts, email, externalId, coordinates });
      if (match.score > maxScore) {
        maxScore = match.score;
        bestMatch = candidate;
        signals.length = 0;
        signals.push(...match.signals);
      }
    }

    const clampedScore = Math.min(maxScore, 1.0);
    const confidenceResult = ConfidenceScore.create(clampedScore);
    const confidence = confidenceResult.success ? confidenceResult.value : ConfidenceScore.low();

    if (bestMatch && clampedScore >= 0.95) {
      return { action: 'MERGE', target: bestMatch, confidence, signals };
    }
    if (bestMatch && clampedScore >= 0.6) {
      return { action: 'FLAG_FOR_REVIEW', target: bestMatch, confidence, signals };
    }
    return { action: 'CREATE', confidence: ConfidenceScore.high(), signals: [] };
  }

  private scoreCandidate({
    candidate,
    phones,
    contacts,
    email,
    externalId,
    coordinates,
  }: {
    candidate: ScrapedProvider;
    phones: readonly Phone[];
    contacts: readonly SocialContact[];
    email: Email | undefined;
    externalId: ExternalId;
    coordinates: { lat: number; lng: number } | undefined;
  }): { score: number; signals: ScraperSignal[] } {
    let score = 0;
    const signals: ScraperSignal[] = [];

    if (candidate.hasExternalId(externalId)) {
      score += 1.0;
      signals.push({
        type: 'EXTERNAL_ID_MATCH',
        sourceKey: externalId.key,
        confidence: 1.0,
        metadata: {},
        createdAt: new Date(),
      });
    }

    const matchedPhones = phones.filter((p) => candidate.hasPhone(p));
    if (matchedPhones.length > 0) {
      score += 0.9;
      signals.push({
        type: 'PHONE_MATCH',
        sourceKey: externalId.key,
        confidence: 0.9,
        metadata: { phones: matchedPhones.map((p) => p.e164) },
        createdAt: new Date(),
      });
    }

    if (email && candidate.email?.equals(email)) {
      score += 0.9;
      signals.push({
        type: 'EMAIL_MATCH',
        sourceKey: externalId.key,
        confidence: 0.9,
        metadata: { email: email.value },
        createdAt: new Date(),
      });
    }

    const matchedContacts = contacts.filter((c) => candidate.hasContact(c.platform, c.handle));
    if (matchedContacts.length > 0) {
      score += 0.8;
      signals.push({
        type: 'CONTACT_MATCH',
        sourceKey: externalId.key,
        confidence: 0.8,
        metadata: { contacts: matchedContacts },
        createdAt: new Date(),
      });
    }

    if (coordinates && candidate.address?.coordinates) {
      const dist = this.haversineKm(coordinates, candidate.address.coordinates);
      if (dist < 0.1) {
        score += 0.3;
        signals.push({
          type: 'LOCATION_MATCH',
          sourceKey: externalId.key,
          confidence: 0.3,
          metadata: { distanceKm: dist },
          createdAt: new Date(),
        });
      }
    }

    return { score, signals };
  }

  private haversineKm(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
    const R = 6371;
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
