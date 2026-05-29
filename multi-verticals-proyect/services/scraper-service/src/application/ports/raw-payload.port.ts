/**
 * RawPayloadRepositoryPort — persistence of the unmodified payload captured
 * by an adapter, before any mapping to the canonical model.
 *
 * Rationale: scraping is expensive (Cloudflare, Patchright, proxy rotations).
 * Keeping the raw payload lets us re-run the mapper after model-v2 evolves
 * without re-scraping. Also the audit trail of what the source emitted at
 * capture time.
 *
 * The payload is opaque to this layer (`unknown`). Each adapter knows its
 * own shape (e.g. TopEscortBabesPayload) and casts when reading back.
 */
export interface RawPayloadRecord {
  /** Adapter identifier — `'topescortbabes'`, `'girlsbcn'`, … */
  readonly source: string;
  /** Stable id of the entity within the source (numeric or slug). */
  readonly sourceId: string;
  /** Canonical URL of the page that produced this payload, when known. */
  readonly sourceUrl?: string;
  /** Opaque payload — the adapter casts it back to its own type. */
  readonly payload: unknown;
  /** ISO-8601 UTC — when the scraper captured this payload. */
  readonly capturedAt: string;
}

export interface RawPayloadCriteria {
  readonly source: string;
  readonly sourceId?: string;
}

export interface RawPayloadRepositoryPort {
  /** Insert or overwrite by (source, sourceId). */
  save(record: RawPayloadRecord): Promise<void>;
  findOne(source: string, sourceId: string): Promise<RawPayloadRecord | null>;
  find(criteria: RawPayloadCriteria): Promise<RawPayloadRecord[]>;
  /** Stream all payloads of a source — used by replay/re-map flows. */
  list(source: string): AsyncIterable<RawPayloadRecord>;
}
