/**
 * Global queue definitions for background jobs across Allcoba.
 */

export const JOB_NAMES = {
  PROCESS_PROVIDER_IMAGES: 'process-provider-images',
  PROCESS_MEDIA: 'process-media',
  PROVIDER_IMAGES_PROCESSED: 'provider-images-processed',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
