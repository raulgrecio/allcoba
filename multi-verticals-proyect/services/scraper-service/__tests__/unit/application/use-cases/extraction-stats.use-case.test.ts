import { describe, expect, it } from 'vitest';

import { ExtractionStatsUseCase } from '#application/use-cases/extraction-stats.use-case.js';
import { InMemoryProviderRepository } from '#infrastructure/adapters/persistence/in-memory-provider.repository.js';

const makeProvider = (overrides: Record<string, unknown> = {}) => ({
  id: 'test:1',
  vertical: 'dating',
  nickname: 'Ana',
  phoneNumber: '+34612345678',
  contactOptions: ['calls', 'whatsapp'],
  photos: [
    {
      id: 'p1',
      url: 'https://cdn.example.com/1.jpg',
      isPrimary: true,
      isVerified: false,
      order: 0,
    },
  ],
  aboutMe: { original: 'Bio de Ana', originalLanguage: 'es', content: null, contentLocale: 'es' },
  baseCity: { id: 'city:madrid' },
  personalDetails: {
    ageYears: 25,
    nationalityId: 'nat:es',
    spokenLanguageCodes: [],
    meetingWith: [],
  },
  attributes: { services: ['masajes', 'GFE'] },
  badges: { verified: true, trans: false, vip: false, pornstar: false },
  links: {},
  externalRefs: [
    { source: 'ardienteplacer', sourceId: '123', sourceUrl: 'https://ardienteplacer.com/123' },
  ],
  metadata: { source: 'ardienteplacer', adapterVersion: 'v2' },
  ...overrides,
});

const uc = new ExtractionStatsUseCase(new InMemoryProviderRepository());

describe('ExtractionStatsUseCase.compute', () => {
  it('calculates 100% fill-rate for complete provider', () => {
    const { sources } = uc.compute([makeProvider() as any], null, 20);
    const src = sources[0]!;
    expect(src.source).toBe('ardienteplacer');
    expect(src.fields['nickname']!.rate).toBe(100);
    expect(src.fields['phone']!.rate).toBe(100);
    expect(src.fields['whatsapp']!.rate).toBe(100);
    expect(src.fields['photos']!.rate).toBe(100);
    expect(src.fields['bio']!.rate).toBe(100);
    expect(src.fields['city']!.rate).toBe(100);
    expect(src.fields['age']!.rate).toBe(100);
    expect(src.fields['nationality']!.rate).toBe(100);
    expect(src.fields['services']!.rate).toBe(100);
    expect(src.fields['isVerified']!.rate).toBe(100);
  });

  it('calculates 0% for empty provider', () => {
    const empty = makeProvider({
      nickname: undefined,
      phoneNumber: undefined,
      contactOptions: [],
      photos: [],
      aboutMe: undefined,
      baseCity: undefined,
      personalDetails: { ageYears: 0, spokenLanguageCodes: [], meetingWith: [] },
      attributes: {},
      badges: { verified: false, trans: false, vip: false, pornstar: false },
    });
    const { sources } = uc.compute([empty as any], null, 20);
    const src = sources[0]!;
    expect(src.fields['nickname']!.rate).toBe(0);
    expect(src.fields['phone']!.rate).toBe(0);
    expect(src.fields['photos']!.rate).toBe(0);
    expect(src.fields['age']!.rate).toBe(0);
  });

  it('groups by source correctly', () => {
    const p1 = makeProvider({
      externalRefs: [{ source: 'bluemove', sourceId: '1', sourceUrl: '' }],
    });
    const p2 = makeProvider({
      externalRefs: [{ source: 'bluemove', sourceId: '2', sourceUrl: '' }],
    });
    const p3 = makeProvider({
      externalRefs: [{ source: 'mislios', sourceId: '3', sourceUrl: '' }],
    });
    const { sources } = uc.compute([p1, p2, p3] as any, null, 20);
    expect(sources).toHaveLength(2);
    expect(sources.find((s) => s.source === 'bluemove')!.total).toBe(2);
    expect(sources.find((s) => s.source === 'mislios')!.total).toBe(1);
  });

  it('detects regression when drop >= threshold', () => {
    const p = makeProvider({ photos: [] }); // photos = 0%
    const baseline = { ardienteplacer: { photos: 90 } };
    const { regressions } = uc.compute([p as any], baseline, 20);
    expect(regressions).toHaveLength(1);
    expect(regressions[0]!.field).toBe('photos');
    expect(regressions[0]!.drop).toBe(90);
  });

  it('does not flag regression below threshold', () => {
    const p = makeProvider({ photos: [] }); // photos = 0%
    const baseline = { ardienteplacer: { photos: 10 } }; // drop 10pp < threshold 20
    const { regressions } = uc.compute([p as any], baseline, 20);
    expect(regressions).toHaveLength(0);
  });

  it('toBaselineData serializes correctly', () => {
    const { sources } = uc.compute([makeProvider() as any], null, 20);
    const bd = uc.toBaselineData(sources);
    expect(bd['ardienteplacer']!['nickname']).toBe(100);
    expect(bd['ardienteplacer']!['photos']).toBe(100);
  });
});

describe('ExtractionStatsUseCase.execute', () => {
  it('reads providers from the repository and computes stats', async () => {
    const repo = new InMemoryProviderRepository();
    await repo.create(makeProvider() as any);
    const useCase = new ExtractionStatsUseCase(repo);

    const { sources } = await useCase.execute({
      vertical: 'dating',
      baseline: null,
      thresholdPp: 20,
    });
    expect(sources).toHaveLength(1);
    expect(sources[0]!.source).toBe('ardienteplacer');
    expect(sources[0]!.fields['nickname']!.rate).toBe(100);
  });

  it('filters by source when requested', async () => {
    const repo = new InMemoryProviderRepository();
    await repo.create(
      makeProvider({
        id: 'a:1',
        externalRefs: [{ source: 'bluemove', sourceId: '1', sourceUrl: '' }],
      }) as any,
    );
    await repo.create(
      makeProvider({
        id: 'b:1',
        externalRefs: [{ source: 'mislios', sourceId: '2', sourceUrl: '' }],
      }) as any,
    );
    const useCase = new ExtractionStatsUseCase(repo);

    const { sources } = await useCase.execute({
      vertical: 'dating',
      baseline: null,
      thresholdPp: 20,
      source: 'mislios',
    });
    expect(sources).toHaveLength(1);
    expect(sources[0]!.source).toBe('mislios');
  });
});
