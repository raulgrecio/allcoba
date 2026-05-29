import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, inArray } from 'drizzle-orm';

import type { ScrapedImageRepositoryPort } from '#application/ports/scraped-image-repository.port.js';
import { scrapedImages } from '#infrastructure/adapters/persistence/postgres/schema/scraper.schema.js';

export class DrizzleScrapedImageRepository implements ScrapedImageRepositoryPort {
  constructor(private readonly db: PostgresJsDatabase<Record<string, never>>) {}

  async hasUrl(urlHash: string): Promise<boolean> {
    const rows = await this.db
      .select({ urlHash: scrapedImages.urlHash })
      .from(scrapedImages)
      .where(eq(scrapedImages.urlHash, urlHash))
      .limit(1);
    return rows.length > 0;
  }

  async findSeenUrls(urlHashes: string[]): Promise<string[]> {
    if (urlHashes.length === 0) return [];
    const rows = await this.db
      .select({ urlHash: scrapedImages.urlHash })
      .from(scrapedImages)
      .where(inArray(scrapedImages.urlHash, urlHashes));
    return rows.map((r) => r.urlHash);
  }

  async markSeen(
    urlHash: string,
    originalUrl: string,
    providerId: string,
    vertical: string,
  ): Promise<void> {
    await this.db
      .insert(scrapedImages)
      .values({ urlHash, originalUrl, providerId, vertical })
      .onConflictDoNothing();
  }
}
