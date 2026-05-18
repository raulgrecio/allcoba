/**
 * ConsolidationService — decides whether scraped data should CREATE, MERGE,
 * or FLAG_FOR_REVIEW against existing ScrapedProviders.
 *
 * Ported from legacy `domain/services/consolidation.service.ts`.
 * Uses canonical types only (no @allcoba/legacy-domain).
 */

import type { GeoPoint, PhoneE164, Email } from '@allcoba/shared-types';
import { logger } from '@allcoba/kernel';

import type { ScrapedProvider } from '../../canonical/scraped-provider.js';
import type { ScraperSignal } from '../../canonical/signals.js';
import { asConfidence, Confidence } from '../../canonical/confidence.js';
import type { ExternalRef } from '../../canonical/external-ref.js';
import { externalRefEquals, externalRefKey } from '../../canonical/external-ref.js';

export type ConsolidationAction = 'CREATE' | 'MERGE' | 'FLAG_FOR_REVIEW' | 'IGNORE';

export interface ConsolidationResult {
  readonly action: ConsolidationAction;
  /** Defined when action is MERGE or FLAG_FOR_REVIEW. */
  readonly target?: ScrapedProvider;
  readonly confidence: ReturnType<typeof asConfidence>;
  readonly signals: readonly ScraperSignal[];
}

export interface ConsolidationInput {
  readonly phones: readonly PhoneE164[];
  readonly email?: Email;
  readonly externalRef: ExternalRef;
  readonly coordinates?: GeoPoint;
  readonly candidates: readonly ScrapedProvider[];
}

export class ConsolidationService {
  private readonly log = logger().child({ component: 'ConsolidationService' });

  consolidate(input: ConsolidationInput): ConsolidationResult {
    const { phones, email, externalRef, coordinates, candidates } = input;

    this.log.debug(
      { sourceKey: externalRefKey(externalRef), candidatesCount: candidates.length },
      'Starting consolidation',
    );

    const signals: ScraperSignal[] = [];
    let bestMatch: ScrapedProvider | undefined;
    let maxScore = 0;

    for (const candidate of candidates) {
      const match = this.scoreCandidate({ candidate, phones, email, externalRef, coordinates });
      if (match.score > maxScore) {
        maxScore = match.score;
        bestMatch = candidate;
        signals.length = 0;
        signals.push(...match.signals);
      }
    }

    const clampedScore = Math.min(maxScore, 1.0);
    const confidence = safeConfidence(clampedScore);

    if (bestMatch && clampedScore >= 0.95) {
      return { action: 'MERGE', target: bestMatch, confidence, signals };
    }
    if (bestMatch && clampedScore >= 0.6) {
      return { action: 'FLAG_FOR_REVIEW', target: bestMatch, confidence, signals };
    }
    return { action: 'CREATE', confidence: Confidence.high, signals: [] };
  }

  private scoreCandidate({
    candidate,
    phones,
    email,
    externalRef,
    coordinates,
  }: {
    candidate: ScrapedProvider;
    phones: readonly PhoneE164[];
    email: Email | undefined;
    externalRef: ExternalRef;
    coordinates: GeoPoint | undefined;
  }): { score: number; signals: ScraperSignal[] } {
    let score = 0;
    const signals: ScraperSignal[] = [];
    const now = new Date().toISOString();
    const sourceKey = externalRefKey(externalRef);

    if (candidate.externalRefs.some((r) => externalRefEquals(r, externalRef))) {
      score += 1.0;
      signals.push({
        type: 'EXTERNAL_ID_MATCH',
        sourceKey,
        confidence: asConfidence(1.0),
        metadata: {},
        createdAt: now,
      });
    }

    const matchedPhones = phones.filter((p) => candidate.phoneNumber === p);
    if (matchedPhones.length > 0) {
      score += 0.9;
      signals.push({
        type: 'PHONE_MATCH',
        sourceKey,
        confidence: asConfidence(0.9),
        metadata: { phones: matchedPhones },
        createdAt: now,
      });
    }

    if (email && candidate.email === email) {
      score += 0.9;
      signals.push({
        type: 'EMAIL_MATCH',
        sourceKey,
        confidence: asConfidence(0.9),
        metadata: { email },
        createdAt: now,
      });
    }

    // Geo scoring requires lat/lng; ScrapedCityRef only carries id at scrape time.
    void coordinates;

    return { score, signals };
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function safeConfidence(n: number) {
  try {
    return asConfidence(n);
  } catch {
    return Confidence.low;
  }
}

function haversineKm(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
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
