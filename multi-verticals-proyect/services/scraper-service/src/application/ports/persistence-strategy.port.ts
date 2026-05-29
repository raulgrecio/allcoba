/**
 * PersistenceStrategyPort — vertical-specific persistence policy.
 *
 * The use case extracts + maps an entity, then delegates persistence to a
 * strategy keyed by `pipeline.defaultVertical`. This isolates the
 * vertical-specific consolidation rules (dating: phone/image dedup +
 * priority-aware merge; real-estate/motor/general: externalRef-keyed
 * overwrite) from `ScrapeUrlUseCase`, which becomes a pure orchestrator.
 *
 * Adding a new vertical = registering one strategy in `container.ts`. The
 * use case never grows new branches.
 */

import type { HasExternalRefs } from '#domain/canonical/external-ref.js';

export type PersistAction = 'CREATE' | 'UPDATE' | 'MERGE' | 'FLAG_FOR_REVIEW' | 'IGNORE';

export interface PersistContext {
  /** Source/pipeline identifier — used for logging and image storage paths. */
  readonly source: string;
  /** Original URL that produced the scraped entity. */
  readonly url: string;
}

export interface PersistResult {
  readonly action: PersistAction;
  readonly entityId?: string;
}

export interface PersistenceStrategyPort<T extends HasExternalRefs> {
  persist(scraped: T, ctx: PersistContext): Promise<PersistResult>;
}
