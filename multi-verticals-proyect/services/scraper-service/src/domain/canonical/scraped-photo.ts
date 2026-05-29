/**
 * ScrapedPhoto — photo as captured from the source before R2 upload.
 *
 * Distinct from PhotoCanonical (shared-types) which requires path, width,
 * height, verificationLevel, uploadedAt — data only available post-upload.
 * ScrapedProvider uses ScrapedPhoto; downstream services receive PhotoCanonical
 * after the media pipeline processes the images.
 */
export interface ScrapedPhoto {
  readonly id: string;
  readonly url: string;
  readonly thumbnail?: string;
  readonly isPrimary: boolean;
  readonly isVerified: boolean;
  readonly order: number;
}
