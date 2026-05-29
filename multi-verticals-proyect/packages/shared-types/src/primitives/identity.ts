/**
 * Identity primitives — branded types for catalog IDs.
 *
 * Branded types preserve DDD value-object semantics (type-safe identity,
 * cannot mix `ProviderId` with `CityId`) without the overhead of a runtime
 * class hierarchy.
 *
 * Scraper-only identity concepts (`ExternalRef`, `Confidence`) live in
 * `services/scraper-service/src/domain/canonical/` — not here.
 */

declare const __brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [__brand]: B };

/** Canonical identifier of any catalog entity (city, country, taxonomy, profile…). */
export type EntityId = Brand<string, 'EntityId'>;

export type ProviderId = Brand<string, 'ProviderId'>;
export type CityId = Brand<string, 'CityId'>;
export type CountryId = Brand<string, 'CountryId'>;
export type NationalityId = Brand<string, 'NationalityId'>;
export type EthnicId = Brand<string, 'EthnicId'>;
export type HairId = Brand<string, 'HairId'>;
export type EyeId = Brand<string, 'EyeId'>;
export type OrientationId = Brand<string, 'OrientationId'>;
export type ReviewId = Brand<string, 'ReviewId'>;
export type AgencyId = Brand<string, 'AgencyId'>;

/** Generic factory — trust at boundary, no runtime check. */
export const asEntityId = (raw: string): EntityId => raw as EntityId;
export const asProviderId = (raw: string): ProviderId => raw as ProviderId;
export const asCityId = (raw: string): CityId => raw as CityId;
export const asCountryId = (raw: string): CountryId => raw as CountryId;
export const asNationalityId = (raw: string): NationalityId => raw as NationalityId;
export const asEthnicId = (raw: string): EthnicId => raw as EthnicId;
export const asHairId = (raw: string): HairId => raw as HairId;
export const asEyeId = (raw: string): EyeId => raw as EyeId;
export const asOrientationId = (raw: string): OrientationId => raw as OrientationId;
export const asReviewId = (raw: string): ReviewId => raw as ReviewId;
export const asAgencyId = (raw: string): AgencyId => raw as AgencyId;
