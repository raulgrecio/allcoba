/**
 * ExtractionStatsUseCase — fill-rate por portal y campo.
 *
 * Lee providers del repositorio, agrupa por fuente y calcula qué porcentaje
 * de perfiles tiene cada campo relleno. Compara contra un baseline opcional
 * para detectar regresiones.
 */

import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';

export interface FieldStat {
  count: number;
  total: number;
  rate: number; // 0–100
}

export interface SourceStats {
  source: string;
  total: number;
  fields: Record<string, FieldStat>;
}

export interface RegressionAlert {
  source: string;
  field: string;
  current: number;
  baseline: number;
  drop: number;
}

export interface StatsResult {
  sources: SourceStats[];
  regressions: RegressionAlert[];
}

export type BaselineData = Record<string, Record<string, number>>; // source → field → rate

// ── Field extractors (pure) ───────────────────────────────────────────────────

type FieldFn = (p: ScrapedProvider) => boolean;

const FIELDS: Record<string, FieldFn> = {
  nickname:    (p) => !!p.nickname,
  phone:       (p) => !!p.phoneNumber,
  whatsapp:    (p) => (p.contactOptions ?? []).includes('whatsapp'),
  telegram:    (p) => !!(p.links as Record<string, unknown>)?.['telegram'] ||
                      (p.contactOptions ?? []).includes('telegram'),
  photos:      (p) => (p.photos?.length ?? 0) > 0,
  bio:         (p) => !!(p.aboutMe as Record<string, unknown> | undefined)?.['original'],
  city:        (p) => !!p.baseCity,
  age:         (p) => ((p.personalDetails?.ageYears) ?? 0) > 0,
  nationality: (p) => !!(p.personalDetails?.nationalityId),
  services:    (p) => ((p.attributes?.['services'] as unknown[] | undefined)?.length ?? 0) > 0,
  isVerified:  (p) => !!(p.badges as Record<string, unknown>)?.['verified'],
  isVip:       (p) => !!(p.badges as Record<string, unknown>)?.['vip'],
};

// ── Use case ──────────────────────────────────────────────────────────────────

export class ExtractionStatsUseCase {
  compute(
    providers: readonly ScrapedProvider[],
    baseline: BaselineData | null,
    thresholdPp: number,
  ): StatsResult {
    const groups = this.groupBySource(providers);
    const sources: SourceStats[] = [];
    const regressions: RegressionAlert[] = [];

    for (const [source, items] of [...groups.entries()].sort()) {
      const total = items.length;
      const fields: Record<string, FieldStat> = {};

      for (const [fname, fn] of Object.entries(FIELDS)) {
        const count = items.filter(fn).length;
        const rate = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
        fields[fname] = { count, total, rate };

        const baseRate = baseline?.[source]?.[fname];
        if (baseRate !== undefined) {
          const drop = baseRate - rate;
          if (drop >= thresholdPp) {
            regressions.push({ source, field: fname, current: rate, baseline: baseRate, drop });
          }
        }
      }

      sources.push({ source, total, fields });
    }

    return { sources, regressions };
  }

  toBaselineData(sources: SourceStats[]): BaselineData {
    const data: BaselineData = {};
    for (const { source, fields } of sources) {
      data[source] = Object.fromEntries(
        Object.entries(fields).map(([f, s]) => [f, s.rate]),
      );
    }
    return data;
  }

  private groupBySource(providers: readonly ScrapedProvider[]): Map<string, ScrapedProvider[]> {
    const map = new Map<string, ScrapedProvider[]>();
    for (const p of providers) {
      const src = p.externalRefs?.[0]?.source ?? (p.metadata as Record<string, unknown>)?.['source'] as string ?? 'unknown';
      if (!map.has(src)) map.set(src, []);
      map.get(src)!.push(p);
    }
    return map;
  }
}
