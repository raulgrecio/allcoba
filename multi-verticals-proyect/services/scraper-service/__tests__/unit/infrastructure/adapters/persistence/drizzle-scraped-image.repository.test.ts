import { describe, expect, it, vi } from 'vitest';
import { eq } from 'drizzle-orm';

import { DrizzleScrapedImageRepository } from '#infrastructure/adapters/persistence/postgres/drizzle-scraped-image.repository.js';
import { scrapedImages } from '#infrastructure/adapters/persistence/postgres/schema/scraper.schema.js';

describe('DrizzleScrapedImageRepository', () => {
  it('should return false for hasUrl when no rows are found', async () => {
    const limitMock = vi.fn().mockResolvedValue([]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    const selectMock = vi.fn().mockReturnValue({ from: fromMock });

    const dbMock = {
      select: selectMock,
    } as any;

    const repo = new DrizzleScrapedImageRepository(dbMock);
    const hash = 'test-hash';

    expect(await repo.hasUrl(hash)).toBe(false);

    expect(selectMock).toHaveBeenCalledWith({ urlHash: scrapedImages.urlHash });
    expect(fromMock).toHaveBeenCalledWith(scrapedImages);
    expect(whereMock).toHaveBeenCalledWith(eq(scrapedImages.urlHash, hash));
    expect(limitMock).toHaveBeenCalledWith(1);
  });

  it('should return true for hasUrl when a row is found', async () => {
    const limitMock = vi.fn().mockResolvedValue([{ urlHash: 'test-hash' }]);
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    const fromMock = vi.fn().mockReturnValue({ where: whereMock });
    const selectMock = vi.fn().mockReturnValue({ from: fromMock });

    const dbMock = {
      select: selectMock,
    } as any;

    const repo = new DrizzleScrapedImageRepository(dbMock);
    const hash = 'test-hash';

    expect(await repo.hasUrl(hash)).toBe(true);
  });

  it('should insert record and do nothing on conflict in markSeen', async () => {
    const onConflictDoNothingMock = vi.fn().mockResolvedValue(undefined);
    const valuesMock = vi.fn().mockReturnValue({ onConflictDoNothing: onConflictDoNothingMock });
    const insertMock = vi.fn().mockReturnValue({ values: valuesMock });

    const dbMock = {
      insert: insertMock,
    } as any;

    const repo = new DrizzleScrapedImageRepository(dbMock);
    
    await repo.markSeen('hash1', 'url1', 'provider1', 'dating');

    expect(insertMock).toHaveBeenCalledWith(scrapedImages);
    expect(valuesMock).toHaveBeenCalledWith({
      urlHash: 'hash1',
      originalUrl: 'url1',
      providerId: 'provider1',
      vertical: 'dating',
    });
    expect(onConflictDoNothingMock).toHaveBeenCalled();
  });
});
