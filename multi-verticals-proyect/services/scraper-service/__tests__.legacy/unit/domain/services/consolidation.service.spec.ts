import { describe, expect, it } from 'vitest';

import { Phone } from '@allcoba/legacy-domain';

import type { SocialContact } from '#domain/aggregates/scraped-provider.aggregate.js';
import { ScrapedProvider } from '#domain/aggregates/scraped-provider.aggregate.js';
import { ContactPlatform } from '#domain/entities/contact-platform.js';
import { Vertical } from '#domain/entities/vertical.js';
import { ConsolidationService } from '#domain/services/consolidation.service.js';
import { ConfidenceScore } from '#domain/value-objects/confidence-score.vo.js';
import { ExternalId } from '#domain/value-objects/external-id.vo.js';
import { ScrapedLocation } from '#domain/value-objects/scraped-location.vo.js';

function phone(raw: string): Phone {
  const r = Phone.create(raw, 'ES');
  if (!r.success) throw new Error(`Invalid phone: ${raw}`);
  return r.value;
}

function externalId(source: string, id: string): ExternalId {
  const r = ExternalId.create(source, id);
  if (!r.success) throw new Error(`Invalid externalId: ${source}:${id}`);
  return r.value;
}

function makeProvider(opts: {
  externalIds?: ExternalId[];
  phones?: Phone[];
  contacts?: SocialContact[];
  coordinates?: { lat: number; lng: number };
}): ScrapedProvider {
  const locationResult = opts.coordinates
    ? ScrapedLocation.create({ address: 'Test address', coordinates: opts.coordinates })
    : null;

  return ScrapedProvider.create({
    vertical: Vertical.REAL_ESTATE,
    confidenceScore: ConfidenceScore.low(),
    externalIds: opts.externalIds ?? [],
    phones: opts.phones ?? [],
    contacts: opts.contacts ?? [],
    location: locationResult?.success ? locationResult.value : undefined,
  });
}

describe('Unit: ConsolidationService', () => {
  const service = new ConsolidationService();

  it('returns CREATE when no candidates', () => {
    const result = service.consolidate({
      phones: [phone('+34919032747')],
      contacts: [],
      externalId: externalId('fotocasa', '123'),
      candidates: [],
    });

    expect(result.action).toBe('CREATE');
    expect(result.confidence.value).toBe(ConfidenceScore.high().value);
    expect(result.signals).toHaveLength(0);
    expect(result.target).toBeUndefined();
  });

  it('returns FLAG_FOR_REVIEW on contact match (score 0.8)', () => {
    const contact: SocialContact = { platform: ContactPlatform.TELEGRAM, handle: 'testuser' };
    const candidate = makeProvider({ contacts: [contact] });

    const result = service.consolidate({
      phones: [],
      contacts: [contact],
      externalId: externalId('idealista', 'abc'),
      candidates: [candidate],
    });

    expect(result.action).toBe('FLAG_FOR_REVIEW');
    expect(result.target).toBe(candidate);
    expect(result.signals.some((s) => s.type === 'CONTACT_MATCH')).toBe(true);
  });

  it('returns CREATE on location-only match (score 0.3 < threshold 0.6)', () => {
    const candidate = makeProvider({
      coordinates: { lat: 40.4168, lng: -3.7034 },
    });

    const result = service.consolidate({
      phones: [],
      contacts: [],
      externalId: externalId('idealista', 'xyz'),
      coordinates: { lat: 40.4167, lng: -3.7033 },
      candidates: [candidate],
    });

    expect(result.action).toBe('CREATE');
    expect(result.signals).toHaveLength(0);
  });

  it('returns MERGE on externalId match (score 1.0)', () => {
    const candidate = makeProvider({
      externalIds: [externalId('fotocasa', '123')],
      phones: [phone('+34919032747')],
    });

    const result = service.consolidate({
      phones: [phone('+34919032747')],
      contacts: [],
      externalId: externalId('fotocasa', '123'),
      candidates: [candidate],
    });

    expect(result.action).toBe('MERGE');
    expect(result.target).toBe(candidate);
    expect(result.confidence.value).toBe(1.0);
    expect(result.signals.some((s) => s.type === 'EXTERNAL_ID_MATCH')).toBe(true);
  });

  it('returns FLAG_FOR_REVIEW on phone match (score 0.9)', () => {
    const candidate = makeProvider({
      externalIds: [externalId('fotocasa', '999')],
      phones: [phone('+34919032747')],
    });

    const result = service.consolidate({
      phones: [phone('+34919032747')],
      contacts: [],
      externalId: externalId('fotocasa', '123'),
      candidates: [candidate],
    });

    expect(result.action).toBe('FLAG_FOR_REVIEW');
    expect(result.signals.some((s) => s.type === 'PHONE_MATCH')).toBe(true);
    expect(result.confidence.value).toBe(0.9);
  });

  it('picks the candidate with the highest score when multiple candidates exist', () => {
    const weakCandidate = makeProvider({
      contacts: [{ platform: ContactPlatform.TELEGRAM, handle: 'weakuser' }],
    });
    const strongCandidate = makeProvider({
      externalIds: [externalId('fotocasa', '123')],
    });

    const result = service.consolidate({
      phones: [],
      contacts: [],
      externalId: externalId('fotocasa', '123'),
      candidates: [weakCandidate, strongCandidate],
    });

    expect(result.action).toBe('MERGE');
    expect(result.target).toBe(strongCandidate);
  });
});
