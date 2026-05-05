import { describe, expect, it } from 'vitest';

import { Phone, Telegram } from '@allcoba/domain';

import { ScrapedProvider } from '#domain/aggregates/scraped-provider.aggregate.js';
import { Vertical } from '#domain/entities/vertical.js';
import { ConsolidationService } from '#domain/services/consolidation.service.js';
import { ConfidenceScore } from '#domain/value-objects/confidence-score.vo.js';
import { ExternalId } from '#domain/value-objects/external-id.vo.js';
import { ScrapedAddress } from '#domain/value-objects/scraped-address.vo.js';

// Helpers to create typed VOs without boilerplate in every test
function phone(raw: string): Phone {
  const r = Phone.create(raw, 'ES');
  if (!r.success) throw new Error(`Invalid phone in test: ${raw}`);
  return r.value;
}

function telegram(handle: string): Telegram {
  const r = Telegram.create(handle);
  if (!r.success) throw new Error(`Invalid telegram in test: ${handle}`);
  return r.value;
}

function externalId(source: string, id: string): ExternalId {
  const r = ExternalId.create(source, id);
  if (!r.success) throw new Error(`Invalid externalId in test: ${source}:${id}`);
  return r.value;
}

function makeProvider(opts: {
  externalIds?: ExternalId[];
  phones?: Phone[];
  telegram?: Telegram;
  coordinates?: { lat: number; lng: number };
}): ScrapedProvider {
  const addressResult = opts.coordinates
    ? ScrapedAddress.create('Test address', opts.coordinates)
    : null;

  return ScrapedProvider.create({
    vertical: Vertical.REAL_ESTATE,
    confidenceScore: ConfidenceScore.low(),
    externalIds: opts.externalIds ?? [],
    phones: opts.phones ?? [],
    telegram: opts.telegram,
    address: addressResult?.success ? addressResult.value : undefined,
  });
}

describe('Unit: ConsolidationService', () => {
  const service = new ConsolidationService();

  it('returns CREATE when no candidates', () => {
    const result = service.consolidate(
      [phone('+34919032747')],
      undefined,
      externalId('fotocasa', '123'),
      undefined,
      [],
    );

    expect(result.action).toBe('CREATE');
    expect(result.confidence.value).toBe(ConfidenceScore.high().value);
    expect(result.signals).toHaveLength(0);
    expect(result.target).toBeUndefined();
  });

  it('returns FLAG_FOR_REVIEW on telegram match (score 0.8)', () => {
    const tg = telegram('testuser');
    const candidate = makeProvider({ telegram: tg });

    const result = service.consolidate([], tg, externalId('idealista', 'abc'), undefined, [
      candidate,
    ]);

    expect(result.action).toBe('FLAG_FOR_REVIEW');
    expect(result.target).toBe(candidate);
    expect(result.signals.some((s) => s.type === 'TELEGRAM_MATCH')).toBe(true);
  });

  it('returns CREATE on location-only match (score 0.3 < threshold 0.6)', () => {
    const candidate = makeProvider({
      coordinates: { lat: 40.4168, lng: -3.7034 },
    });

    const result = service.consolidate(
      [],
      undefined,
      externalId('idealista', 'xyz'),
      { lat: 40.4167, lng: -3.7033 }, // ~14 m away
      [candidate],
    );

    // 0.3 is below FLAG_FOR_REVIEW threshold (0.6), so CREATE
    expect(result.action).toBe('CREATE');
    expect(result.signals).toHaveLength(0); // signals only from bestMatch
  });

  it('returns MERGE on externalId match (score 1.0)', () => {
    const candidate = makeProvider({
      externalIds: [externalId('fotocasa', '123')],
      phones: [phone('+34919032747')],
    });

    const result = service.consolidate(
      [phone('+34919032747')],
      undefined,
      externalId('fotocasa', '123'),
      undefined,
      [candidate],
    );

    expect(result.action).toBe('MERGE');
    expect(result.target).toBe(candidate);
    // ExternalId (1.0) + Phone (0.9) = 1.9 → clamped to 1.0
    expect(result.confidence.value).toBe(1.0);
    expect(result.signals.some((s) => s.type === 'EXTERNAL_ID_MATCH')).toBe(true);
  });

  it('returns FLAG_FOR_REVIEW on phone match (score 0.9)', () => {
    const candidate = makeProvider({
      externalIds: [externalId('fotocasa', '999')],
      phones: [phone('+34919032747')],
    });

    const result = service.consolidate(
      [phone('+34919032747')],
      undefined,
      externalId('fotocasa', '123'),
      undefined,
      [candidate],
    );

    expect(result.action).toBe('FLAG_FOR_REVIEW');
    expect(result.signals.some((s) => s.type === 'PHONE_MATCH')).toBe(true);
    expect(result.confidence.value).toBe(0.9);
  });

  it('picks the candidate with the highest score when multiple candidates exist', () => {
    const weakCandidate = makeProvider({
      telegram: telegram('weaktestuser'),
    });
    const strongCandidate = makeProvider({
      externalIds: [externalId('fotocasa', '123')],
    });

    const result = service.consolidate([], undefined, externalId('fotocasa', '123'), undefined, [
      weakCandidate,
      strongCandidate,
    ]);

    expect(result.action).toBe('MERGE');
    expect(result.target).toBe(strongCandidate);
  });
});
