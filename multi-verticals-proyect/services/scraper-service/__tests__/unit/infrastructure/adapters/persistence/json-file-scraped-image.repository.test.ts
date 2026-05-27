import fs from 'fs/promises';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { JsonFileScrapedImageRepository } from '#infrastructure/adapters/persistence/json/json-file-scraped-image.repository.js';

describe('JsonFileScrapedImageRepository', () => {
  const basePath = '__data/temp/test-scraped-images';
  const filePath = path.resolve(process.cwd(), basePath, 'scraped-images.json');

  const cleanUp = async () => {
    try {
      await fs.rm(basePath, { recursive: true, force: true });
    } catch {
      // ignore
    }
  };

  beforeEach(cleanUp);
  afterEach(cleanUp);

  it('should return false for hasUrl initially and true after markSeen', async () => {
    const repo = new JsonFileScrapedImageRepository({ basePath });

    const hash = 'hash123';
    expect(await repo.hasUrl(hash)).toBe(false);

    await repo.markSeen(hash, 'https://example.com/img.jpg', 'provider1', 'dating');

    expect(await repo.hasUrl(hash)).toBe(true);

    // Verify file content exists and is valid JSON
    const content = await fs.readFile(filePath, 'utf-8');
    const records = JSON.parse(content);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      urlHash: hash,
      originalUrl: 'https://example.com/img.jpg',
      providerId: 'provider1',
      vertical: 'dating',
    });
  });

  it('should not write duplicate entries if markSeen is called on already seen hash', async () => {
    const repo = new JsonFileScrapedImageRepository({ basePath });
    const hash = 'duplicate-hash';

    await repo.markSeen(hash, 'url', 'p1', 'dating');
    await repo.markSeen(hash, 'url', 'p1', 'dating');

    const content = await fs.readFile(filePath, 'utf-8');
    const records = JSON.parse(content);
    expect(records).toHaveLength(1);
  });

  it('should handle concurrent markSeen calls safely using the sequential queue', async () => {
    const repo = new JsonFileScrapedImageRepository({ basePath });
    const count = 10;
    const hashes = Array.from({ length: count }, (_, i) => `hash-${i}`);

    // Call markSeen concurrently
    await Promise.all(
      hashes.map((hash, i) =>
        repo.markSeen(hash, `https://example.com/${i}.jpg`, `prov-${i}`, 'dating'),
      ),
    );

    // Check that all hashes are seen
    for (const hash of hashes) {
      expect(await repo.hasUrl(hash)).toBe(true);
    }

    // Verify all records were appended correctly to the file without race conditions
    const content = await fs.readFile(filePath, 'utf-8');
    const records = JSON.parse(content);
    expect(records).toHaveLength(count);

    const savedHashes = records.map((r: { urlHash: string }) => r.urlHash);
    expect(savedHashes.sort()).toEqual(hashes.sort());
  });

  it('should handle write errors gracefully and log them', async () => {
    const repo = new JsonFileScrapedImageRepository({ basePath });
    const spy = vi.spyOn(fs, 'writeFile').mockRejectedValueOnce(new Error('Mock Write Error'));

    // Should resolve cleanly even if writing fails
    await expect(repo.markSeen('error-hash', 'url', 'p1', 'dating')).resolves.not.toThrow();

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
