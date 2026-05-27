import { afterEach, describe, expect, it, vi } from 'vitest';

import type { StatsResult } from '#application/use-cases/extraction-stats.use-case.js';
import { printReport } from '#infrastructure/cli/cli-output.js';
import { CrawlerLifecycle } from '#infrastructure/cli/crawler-lifecycle.js';
import { formatStatsReport } from '#infrastructure/cli/stats-reporter.js';

// ============================================================================
// cli-output
// ============================================================================
describe('printReport', () => {
  it('writes text + newline to stdout', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    printReport('hello');
    expect(write).toHaveBeenCalledWith('hello\n');
    write.mockRestore();
  });

  it('handles empty string', () => {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    printReport('');
    expect(write).toHaveBeenCalledWith('\n');
    write.mockRestore();
  });
});

// ============================================================================
// CrawlerLifecycle
// ============================================================================
describe('CrawlerLifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shutdown does nothing when no crawler tracked', async () => {
    const lifecycle = new CrawlerLifecycle();
    await expect(lifecycle.shutdown()).resolves.not.toThrow();
  });

  it('shutdown calls close on tracked crawler', async () => {
    const lifecycle = new CrawlerLifecycle();
    const crawler = { close: vi.fn().mockResolvedValue(undefined) };
    lifecycle.track(crawler);
    await lifecycle.shutdown();
    expect(crawler.close).toHaveBeenCalledOnce();
  });

  it('shutdown clears active after closing', async () => {
    const lifecycle = new CrawlerLifecycle();
    const crawler = { close: vi.fn().mockResolvedValue(undefined) };
    lifecycle.track(crawler);
    await lifecycle.shutdown();
    // Second shutdown should not call close again
    await lifecycle.shutdown();
    expect(crawler.close).toHaveBeenCalledOnce();
  });

  it('shutdown swallows close errors', async () => {
    const lifecycle = new CrawlerLifecycle();
    const crawler = { close: vi.fn().mockRejectedValue(new Error('close fail')) };
    lifecycle.track(crawler);
    await expect(lifecycle.shutdown()).resolves.not.toThrow();
  });

  it('track replaces previously tracked crawler', async () => {
    const lifecycle = new CrawlerLifecycle();
    const c1 = { close: vi.fn().mockResolvedValue(undefined) };
    const c2 = { close: vi.fn().mockResolvedValue(undefined) };
    lifecycle.track(c1);
    lifecycle.track(c2);
    await lifecycle.shutdown();
    expect(c2.close).toHaveBeenCalledOnce();
    expect(c1.close).not.toHaveBeenCalled();
  });

  it('triggers shutdown on process SIGTERM and SIGINT', async () => {
    const handlers: Record<string, () => void> = {};
    const spy = vi.spyOn(process, 'on').mockImplementation((event: unknown, handler: unknown) => {
      handlers[event as string] = handler as () => void;
      return process;
    });

    const lifecycle = new CrawlerLifecycle();
    const shutdownSpy = vi.spyOn(lifecycle, 'shutdown').mockResolvedValue(undefined);

    expect(handlers['SIGTERM']).toBeDefined();
    expect(handlers['SIGINT']).toBeDefined();

    handlers['SIGTERM']!();
    expect(shutdownSpy).toHaveBeenCalled();

    shutdownSpy.mockClear();
    handlers['SIGINT']!();
    expect(shutdownSpy).toHaveBeenCalled();

    spy.mockRestore();
  });
});

// ============================================================================
// formatStatsReport
// ============================================================================
const makeResult = (overrides: {
  source?: string;
  total?: number;
  rate?: number;
  regressions?: {
    source: string;
    field: string;
    current: number;
    baseline: number;
    drop: number;
  }[];
}) => ({
  sources: [
    {
      source: overrides.source ?? 'test-source',
      total: overrides.total ?? 10,
      fields: {
        nickname: {
          count: Math.round(((overrides.rate ?? 80) / 100) * (overrides.total ?? 10)),
          total: overrides.total ?? 10,
          rate: overrides.rate ?? 80,
        },
      },
    },
  ],
  regressions: overrides.regressions ?? [],
});

describe('formatStatsReport', () => {

  it('includes source name in output', () => {
    const result = makeResult({ source: 'eurogirlsescort' });
    const report = formatStatsReport(result, null, 20);
    expect(report).toContain('eurogirlsescort');
  });

  it('includes field name and rate', () => {
    const result = makeResult({ rate: 75 });
    const report = formatStatsReport(result, null, 20);
    expect(report).toContain('nickname');
    expect(report).toContain('75.0');
  });

  it('shows "Sin baseline" message when baseline null', () => {
    const result = makeResult({});
    const report = formatStatsReport(result, null, 20);
    expect(report).toContain('Sin baseline');
  });

  it('shows OK message when no regressions and baseline present', () => {
    const result = makeResult({ rate: 80 });
    const baseline = { 'test-source': { nickname: 80 } };
    const report = formatStatsReport(result, baseline, 20);
    expect(report).toContain('Sin regresiones');
  });

  it('shows regression warning when regressions present', () => {
    const result = makeResult({
      rate: 40,
      regressions: [
        { source: 'test-source', field: 'nickname', current: 40, baseline: 80, drop: 40 },
      ],
    });
    const baseline = { 'test-source': { nickname: 80 } };
    const report = formatStatsReport(result, baseline, 20);
    expect(report).toContain('regresión');
  });

  it('shows regression marker for field drop > threshold', () => {
    const result = makeResult({ rate: 50 });
    const baseline = { 'test-source': { nickname: 80 } };
    const report = formatStatsReport(result, baseline, 20);
    expect(report).toContain('REGRESIÓN');
  });

  it('shows yellow arrow for small drop below threshold', () => {
    const result = makeResult({ rate: 70 });
    const baseline = { 'test-source': { nickname: 80 } };
    const report = formatStatsReport(result, baseline, 20);
    // -10pp < 20pp threshold → yellow ↓ marker
    expect(report).toContain('↓');
  });

  it('shows green arrow for improvement', () => {
    const result = makeResult({ rate: 90 });
    const baseline = { 'test-source': { nickname: 80 } };
    const report = formatStatsReport(result, baseline, 20);
    expect(report).toContain('↑');
  });

  it('handles missing baseline field (base undefined → no marker)', () => {
    const result = makeResult({ rate: 80 });
    const baseline = { 'test-source': {} };
    const report = formatStatsReport(result, baseline, 20);
    // no regression, no marker — should at least not throw
    expect(report).toBeTruthy();
  });

  it('handles multiple sources', () => {
    const result: StatsResult = {
      sources: [
        { source: 'src-a', total: 5, fields: { nickname: { count: 5, total: 5, rate: 100 } } },
        { source: 'src-b', total: 3, fields: { phone: { count: 0, total: 3, rate: 0 } } },
      ],
      regressions: [],
    };
    const report = formatStatsReport(result, null, 20);
    expect(report).toContain('src-a');
    expect(report).toContain('src-b');
  });
});
