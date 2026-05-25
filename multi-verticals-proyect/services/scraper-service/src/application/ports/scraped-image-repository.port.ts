export interface ScrapedImageRepositoryPort {
  /** Returns true if the URL (identified by sha256 hash) was already downloaded. */
  hasUrl(urlHash: string): Promise<boolean>;
  /** Records that a URL was downloaded and enqueued for processing. */
  markSeen(
    urlHash: string,
    originalUrl: string,
    providerId: string,
    vertical: string,
  ): Promise<void>;
}
