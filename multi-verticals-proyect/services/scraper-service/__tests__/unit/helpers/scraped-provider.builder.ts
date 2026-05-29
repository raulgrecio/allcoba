/**
 * Minimal ScrapedProvider builder for unit tests.
 * Produces a valid object with sensible defaults; pass overrides to shape.
 */

import { randomUUID } from 'node:crypto';

import { asProviderId } from '@allcoba/shared-types';

import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { asConfidence } from '#domain/canonical/confidence.js';

export const buildProvider = (overrides: Partial<ScrapedProvider> = {}): ScrapedProvider => ({
  id: asProviderId(randomUUID()),
  vertical: 'dating',
  nickname: 'Test Provider',
  active: true,
  humanVerified: false,
  badges: { vip: false, verified: false, trans: false, pornstar: false },
  verificationStatus: 'pending_review',
  meetingPlaces: { incall: false, outcall: false },
  contactOptions: [],
  personalDetails: {
    ageYears: 25,
    spokenLanguageCodes: [],
    meetingWith: [],
  },
  prices: [],
  tours: [],
  photos: [],
  links: {},
  otherPlatforms: [],
  reviewsEnabled: false,
  reviewsCount: 0,
  reviewsRating: 0,
  reviews: [],
  externalRefs: [{ source: 'test-source', sourceId: 'test-001' }],
  signals: [],
  confidence: asConfidence(0.9),
  images: [],
  attributes: {},
  metadata: {},
  lastScrapedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});
