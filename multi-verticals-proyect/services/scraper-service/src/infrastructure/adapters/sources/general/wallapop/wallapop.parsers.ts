import type { ListingCondition, ListingShipping } from '@allcoba/shared-types';

/**
 * Wallapop detail URLs follow `wallapop.com/item/{slug}` where slug ends in
 * `-{numericId}`. Returns the numeric id when present, else the slug, else
 * the last URL segment.
 */
export function parseSourceIdFromUrl(url: string): string {
  const match = url.match(/\/item\/([a-z0-9-]+?)(?:-(\d{6,}))?\/?$/i);
  if (match) {
    return match[2] ?? match[1] ?? url;
  }
  const last = url.split('/').filter(Boolean).pop();
  return last ?? url;
}

/**
 * Wallapop publishes condition.value as a snake_case enum. Map to the
 * canonical `ListingCondition`.
 */
export function parseCondition(value?: string): ListingCondition | undefined {
  if (!value) return undefined;
  switch (value.toLowerCase()) {
    case 'new':
      return 'new';
    case 'as_good_as_new':
      return 'as-new';
    case 'in_good_condition':
    case 'good':
      return 'good';
    case 'has_given_it_all':
    case 'fair':
      return 'fair';
    case 'unacceptable':
    case 'damaged':
      return 'damaged';
    case 'very_good':
      return 'very-good';
    default:
      return 'unknown';
  }
}

/**
 * Wallapop publishes shipping as { isItemShippable, isShippingAllowedByUser }.
 * Map to the canonical `ListingShipping`.
 */
export function parseShipping(shipping?: {
  isItemShippable?: boolean;
  isShippingAllowedByUser?: boolean;
}): ListingShipping | undefined {
  if (!shipping) return undefined;
  if (shipping.isShippingAllowedByUser === true && shipping.isItemShippable === true) {
    return 'allowed';
  }
  if (shipping.isItemShippable === false || shipping.isShippingAllowedByUser === false) {
    return 'not-allowed';
  }
  return 'unknown';
}
