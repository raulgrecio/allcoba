import fs from 'fs/promises';
import path from 'path';

import { logger } from '@allcoba/kernel';

import type {
  RawPayloadCriteria,
  RawPayloadRecord,
  RawPayloadRepositoryPort,
} from '#application/ports/raw-payload.port.js';

/**
 * JsonFileRawPayloadRepository — dev/test persistence for raw source payloads.
 *
 * One file per source under `<basePath>/raw/<source>.json`. Each file holds an
 * array of RawPayloadRecord keyed by sourceId; a re-save overwrites the entry
 * for the same (source, sourceId) pair.
 */
export class JsonFileRawPayloadRepository implements RawPayloadRepositoryPort {
  private readonly basePath: string;
  private readonly log = logger().child({ component: 'JsonFileRawPayloadRepository' });

  constructor({ basePath = '__data/storage/raw' }: { basePath?: string } = {}) {
    this.basePath = path.resolve(process.cwd(), basePath);
  }

  private fileFor(source: string): string {
    return path.join(this.basePath, `${source}.json`);
  }

  private async load(source: string): Promise<Map<string, RawPayloadRecord>> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      const content = await fs.readFile(this.fileFor(source), 'utf-8');
      const records: RawPayloadRecord[] = JSON.parse(content);
      const map = new Map<string, RawPayloadRecord>();
      for (const r of records) map.set(r.sourceId, r);
      return map;
    } catch {
      return new Map();
    }
  }

  private async persist(source: string, map: Map<string, RawPayloadRecord>): Promise<void> {
    const records = Array.from(map.values());
    await fs.mkdir(this.basePath, { recursive: true });
    await fs.writeFile(this.fileFor(source), JSON.stringify(records, null, 2));
    this.log.debug({ source, count: records.length }, 'Saved raw payloads');
  }

  async save(record: RawPayloadRecord): Promise<void> {
    const map = await this.load(record.source);
    map.set(record.sourceId, record);
    await this.persist(record.source, map);
  }

  async findOne(source: string, sourceId: string): Promise<RawPayloadRecord | null> {
    const map = await this.load(source);
    return map.get(sourceId) ?? null;
  }

  async find(criteria: RawPayloadCriteria): Promise<RawPayloadRecord[]> {
    const map = await this.load(criteria.source);
    const all = Array.from(map.values());
    if (!criteria.sourceId) return all;
    return all.filter((r) => r.sourceId === criteria.sourceId);
  }

  async *list(source: string): AsyncIterable<RawPayloadRecord> {
    const map = await this.load(source);
    for (const r of map.values()) yield r;
  }
}
