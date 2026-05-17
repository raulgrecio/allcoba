/**
 * Signals — audit trail of entity-resolution decisions made by the scraper.
 *
 * Scraper-only.
 */

import type { Confidence } from './confidence.js';

export type SignalType =
  | 'PHONE_MATCH'
  | 'EMAIL_MATCH'
  | 'CONTACT_MATCH'
  | 'EXTERNAL_ID_MATCH'
  | 'LOCATION_MATCH'
  | 'IMAGE_MATCH'
  | 'TEXT_SIMILARITY';

export interface ScraperSignal {
  readonly type: SignalType;
  /** ExternalRef key format: `'source:sourceId'`. */
  readonly sourceKey: string;
  readonly confidence: Confidence;
  readonly metadata: Readonly<Record<string, unknown>>;
  /** ISO-8601 UTC. */
  readonly createdAt: string;
}
