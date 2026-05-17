/**
 * Confidence — score for entity-resolution or signal strength.
 *
 * Scraper-only: emerges from matching heuristics inside the scraper pipeline.
 * The marketplace consumes already-merged profiles and does not need to know
 * the underlying confidence.
 */

import type { Brand } from '@allcoba/shared-types';

export type Confidence = Brand<number, 'Confidence'>;

export const asConfidence = (n: number): Confidence => {
  if (!Number.isFinite(n) || n < 0 || n > 1) {
    throw new RangeError(`Confidence must be in [0,1], got ${n}`);
  }
  return n as Confidence;
};

export const Confidence = {
  high: asConfidence(0.95),
  medium: asConfidence(0.8),
  low: asConfidence(0.5),
  isHigh: (c: Confidence): boolean => c >= 0.9,
  isMedium: (c: Confidence): boolean => c >= 0.7 && c < 0.9,
} as const;
