import type {
  RawPayloadCriteria,
  RawPayloadRecord,
  RawPayloadRepositoryPort,
} from '#application/ports/raw-payload.port.js';

/**
 * In-memory raw store. Use for unit tests of the mapper / adapter pipeline.
 */
export class InMemoryRawPayloadRepository implements RawPayloadRepositoryPort {
  private readonly store = new Map<string, RawPayloadRecord>();

  private keyOf(source: string, sourceId: string): string {
    return `${source}::${sourceId}`;
  }

  async save(record: RawPayloadRecord): Promise<void> {
    this.store.set(this.keyOf(record.source, record.sourceId), record);
  }

  async findOne(source: string, sourceId: string): Promise<RawPayloadRecord | null> {
    return this.store.get(this.keyOf(source, sourceId)) ?? null;
  }

  async find(criteria: RawPayloadCriteria): Promise<RawPayloadRecord[]> {
    const results: RawPayloadRecord[] = [];
    for (const r of this.store.values()) {
      if (r.source !== criteria.source) continue;
      if (criteria.sourceId && r.sourceId !== criteria.sourceId) continue;
      results.push(r);
    }
    return results;
  }

  async *list(source: string): AsyncIterable<RawPayloadRecord> {
    for (const r of this.store.values()) {
      if (r.source === source) yield r;
    }
  }
}
