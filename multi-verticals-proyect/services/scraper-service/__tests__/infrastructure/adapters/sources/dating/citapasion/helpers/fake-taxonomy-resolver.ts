import type { CityId, CountryId, EthnicId, EyeId, HairId, NationalityId, OrientationId } from '@allcoba/shared-types';
import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';

export class FakeTaxonomyResolver implements TaxonomyResolverPort {
  resolveCity(slug: string, _countryIso2?: string): Promise<CityId | null> {
    return Promise.resolve(`city:${slug}` as CityId);
  }
  resolveCountry(slug: string): Promise<CountryId | null> {
    return Promise.resolve(`country:${slug}` as CountryId);
  }
  resolveNationality(slug: string): Promise<NationalityId | null> {
    return Promise.resolve(`nationality:${slug}` as NationalityId);
  }
  resolveEthnic(slug: string): Promise<EthnicId | null> {
    return Promise.resolve(`ethnic:${slug}` as EthnicId);
  }
  resolveHair(slug: string): Promise<HairId | null> {
    return Promise.resolve(`hair:${slug}` as HairId);
  }
  resolveEye(slug: string): Promise<EyeId | null> {
    return Promise.resolve(`eye:${slug}` as EyeId);
  }
  resolveOrientation(slug: string): Promise<OrientationId | null> {
    return Promise.resolve(`orientation:${slug}` as OrientationId);
  }
}
