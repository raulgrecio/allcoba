import type { ListingCondition, ListingShipping } from '@allcoba/shared-types';

export interface WallapopPhoto {
  readonly position: number;
  readonly url: string;
  readonly thumbnail?: string;
}

export interface WallapopPayload {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly description?: string;

  readonly priceAmount?: number;
  readonly currency?: string;

  readonly brand?: string;
  readonly model?: string;
  readonly condition?: ListingCondition;
  readonly shipping?: ListingShipping;

  readonly city?: string;
  readonly postalCode?: string;
  readonly coordinates?: { readonly lat: number; readonly lng: number };

  readonly categoryPath: readonly string[];

  readonly photos: readonly WallapopPhoto[];

  readonly views?: number;
  readonly favorites?: number;
}
