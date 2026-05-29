import { describe, expect, it } from 'vitest';

import { asEmail, asPhoneE164 } from '@allcoba/shared-types';

import { ConsolidationService } from '#domain/services/canonical/consolidation.service.js';

import { buildProvider } from '../../../helpers/scraped-provider.builder.js';

const svc = new ConsolidationService();

const REF = { source: 'test-src', sourceId: 'id-001' };
const PHONE = asPhoneE164('+34612345678');

describe('ConsolidationService.consolidate', () => {
  it('no candidates → CREATE with high confidence', () => {
    const r = svc.consolidate({ phones: [], externalRef: REF, candidates: [] });
    expect(r.action).toBe('CREATE');
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('externalRef match → MERGE', () => {
    const candidate = buildProvider({ externalRefs: [REF] });
    const r = svc.consolidate({ phones: [], externalRef: REF, candidates: [candidate] });
    expect(r.action).toBe('MERGE');
    expect(r.target?.id).toBe(candidate.id);
    expect(r.signals.some((s) => s.type === 'EXTERNAL_ID_MATCH')).toBe(true);
  });

  it('phone match alone → FLAG_FOR_REVIEW (score 0.9 < 0.95 threshold)', () => {
    const candidate = buildProvider({ phoneNumber: PHONE });
    const r = svc.consolidate({
      phones: [PHONE],
      externalRef: { source: 'other', sourceId: 'other-001' },
      candidates: [candidate],
    });
    expect(r.action).toBe('FLAG_FOR_REVIEW');
    expect(r.signals.some((s) => s.type === 'PHONE_MATCH')).toBe(true);
  });

  it('phone + externalRef match → MERGE (score > 0.95)', () => {
    const candidate = buildProvider({ phoneNumber: PHONE, externalRefs: [REF] });
    const r = svc.consolidate({
      phones: [PHONE],
      externalRef: REF,
      candidates: [candidate],
    });
    expect(r.action).toBe('MERGE');
  });

  it('email match alone → FLAG_FOR_REVIEW (score 0.9 < 0.95)', () => {
    const email = asEmail('test@example.com');
    const candidate = buildProvider({ email });
    const r = svc.consolidate({
      phones: [],
      email,
      externalRef: { source: 'other', sourceId: 'x' },
      candidates: [candidate],
    });
    expect(r.action).toBe('FLAG_FOR_REVIEW');
    expect(r.signals.some((s) => s.type === 'EMAIL_MATCH')).toBe(true);
  });

  it('partial score (no phone/email match, wrong externalRef) → CREATE', () => {
    const candidate = buildProvider({
      externalRefs: [{ source: 'other', sourceId: 'other-999' }],
    });
    const r = svc.consolidate({
      phones: [],
      externalRef: { source: 'src', sourceId: 'id-999' },
      candidates: [candidate],
    });
    expect(r.action).toBe('CREATE');
  });

  it('picks candidate with highest score when multiple present', () => {
    const weak = buildProvider({ externalRefs: [{ source: 'other', sourceId: 'weak' }] });
    const strong = buildProvider({ externalRefs: [REF] });
    const r = svc.consolidate({ phones: [], externalRef: REF, candidates: [weak, strong] });
    expect(r.target?.id).toBe(strong.id);
  });

  it('signals array non-empty on match', () => {
    const candidate = buildProvider({ externalRefs: [REF] });
    const r = svc.consolidate({ phones: [], externalRef: REF, candidates: [candidate] });
    expect(r.signals.length).toBeGreaterThan(0);
  });
});
