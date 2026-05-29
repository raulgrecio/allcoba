/**
 * Media canonical types — photos and main media of a profile.
 *
 * Times are ISO-8601 strings (`uploadedAt`, `verifiedAt`), never relative
 * humanized strings. Localized labels (e.g. "looked similar") live in
 * `enum_labels` keyed by the verification level.
 */

import type { MediaOrientation, MediaType, PhotoVerificationLevel } from '../primitives/enums.js';
import type { Brand } from '../primitives/identity.js';

export type ImageHash = Brand<string, 'ImageHash'>;
export const asImageHash = (raw: string): ImageHash => raw as ImageHash;

export interface PhotoCanonical {
  readonly path: string;
  readonly srcset?: string;
  readonly pathSrcset?: string;
  readonly thumbnail?: string;
  readonly width: number;
  readonly height: number;
  readonly verificationLevel: PhotoVerificationLevel;
  /** ISO-8601 UTC. */
  readonly uploadedAt: string;
  /** ISO-8601 UTC, when applicable. */
  readonly verifiedAt?: string;
  /** Hash for deduplication across sources. */
  readonly hash?: ImageHash;
  /** Original URL from the source (debug / re-fetch). */
  readonly sourceUrl?: string;
}

export interface MainMediaCanonical {
  readonly type: MediaType;
  readonly path: string;
  readonly poster?: string;
  readonly fallback?: string;
  readonly orientation: MediaOrientation;
  readonly width: number;
  readonly height: number;
  readonly smallImage?: string;
}

export const photoEquals = (a: PhotoCanonical, b: PhotoCanonical): boolean => {
  if (a.hash && b.hash) return a.hash === b.hash;
  return a.path === b.path;
};
