/**
 * Global queue definitions for background jobs across Allcoba.
 */

export const JOB_NAMES = {
  PROCESS_PROVIDER_IMAGES: 'process-provider-images',
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];
