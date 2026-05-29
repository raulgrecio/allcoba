/**
 * ProfileImage — image after dedup + upload to R2 by the scraper pipeline.
 *
 * Scraper-only: the marketplace only consumes the final URL (carried in
 * `PhotoCanonical.path` from shared-types). The mapping between `originalUrl`
 * (source) and `storedUrl` (R2) lives here for provenance and re-fetch.
 */

import type { ImageHash } from '@allcoba/shared-types';

export interface ProfileImage {
  readonly storedUrl: string;
  readonly originalUrl: string;
  readonly hash: ImageHash;
}

export const profileImageEquals = (a: ProfileImage, b: ProfileImage): boolean => a.hash === b.hash;
