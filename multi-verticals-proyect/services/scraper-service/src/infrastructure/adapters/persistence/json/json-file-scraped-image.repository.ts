import fs from 'fs/promises';
import path from 'path';

import type { ScrapedImageRepositoryPort } from '#application/ports/scraped-image-repository.port.js';

interface ScrapedImageRecord {
  urlHash: string;
  originalUrl: string;
  providerId: string;
  vertical: string;
  seenAt: string;
}

export class JsonFileScrapedImageRepository implements ScrapedImageRepositoryPort {
  private readonly filePath: string;
  private cache: Set<string> | null = null;
  private loadPromise: Promise<Set<string>> | null = null;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor({ basePath = '__data/storage' }: { basePath?: string } = {}) {
    this.filePath = path.resolve(process.cwd(), basePath, 'scraped-images.json');
  }

  private async load(): Promise<Set<string>> {
    if (this.cache) return this.cache;
    if (!this.loadPromise) {
      this.loadPromise = (async () => {
        try {
          await fs.mkdir(path.dirname(this.filePath), { recursive: true });
          const content = await fs.readFile(this.filePath, 'utf-8');
          const records: ScrapedImageRecord[] = JSON.parse(content);
          this.cache = new Set(records.map((r) => r.urlHash));
        } catch {
          this.cache = new Set();
        }
        return this.cache;
      })();
    }
    return this.loadPromise;
  }

  private async appendRecord(record: ScrapedImageRecord): Promise<void> {
    let records: ScrapedImageRecord[] = [];
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      records = JSON.parse(content);
    } catch {
      // first write
    }
    records.push(record);
    await fs.writeFile(this.filePath, JSON.stringify(records, null, 2));
  }

  async hasUrl(urlHash: string): Promise<boolean> {
    const seen = await this.load();
    return seen.has(urlHash);
  }

  async findSeenUrls(urlHashes: string[]): Promise<string[]> {
    const seen = await this.load();
    return urlHashes.filter((hash) => seen.has(hash));
  }

  async markSeen(
    urlHash: string,
    originalUrl: string,
    providerId: string,
    vertical: string,
  ): Promise<void> {
    const seen = await this.load();
    if (seen.has(urlHash)) return;
    seen.add(urlHash);

    // Encolar escritura secuencialmente para evitar condiciones de carrera
    this.writeQueue = this.writeQueue
      .then(async () => {
        await this.appendRecord({
          urlHash,
          originalUrl,
          providerId,
          vertical,
          seenAt: new Date().toISOString(),
        });
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        import('@allcoba/kernel').then(({ logger }) => {
          logger().error({ err: msg }, 'Error escribiendo registro de imagen en JSON');
        });
      });

    await this.writeQueue;
  }
}
