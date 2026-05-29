import * as cheerio from 'cheerio';

import type { WallapopPayload, WallapopPhoto } from './wallapop.types.js';
import { parseCondition, parseShipping, parseSourceIdFromUrl } from './wallapop.parsers.js';

interface WallapopImageUrls {
  small?: string;
  medium?: string;
  big?: string;
}

interface WallapopImage {
  id?: string;
  urls?: WallapopImageUrls;
}

interface WallapopTaxonomy {
  id?: string;
  name?: string;
}

interface WallapopLocation {
  latitude?: number;
  longitude?: number;
  city?: string;
  postalCode?: string;
  countryCode?: string;
}

interface WallapopItem {
  id?: string;
  slug?: string;
  shareUrl?: string;
  title?: { original?: string };
  description?: { original?: string } | string;
  price?: { cash?: { amount?: number; currency?: string } };
  brand?: string;
  model?: string;
  condition?: { value?: string };
  shipping?: { isItemShippable?: boolean; isShippingAllowedByUser?: boolean };
  location?: WallapopLocation;
  taxonomies?: WallapopTaxonomy[];
  images?: WallapopImage[];
  views?: number;
  favorites?: number;
}

interface WallapopNextData {
  props?: { pageProps?: { item?: WallapopItem } };
}

function extractNextData(html: string): WallapopItem | null {
  const $ = cheerio.load(html);
  const raw = $('#__NEXT_DATA__').html();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as WallapopNextData;
    return parsed?.props?.pageProps?.item ?? null;
  } catch {
    return null;
  }
}

function takeBest(urls?: WallapopImageUrls): string | undefined {
  return urls?.big ?? urls?.medium ?? urls?.small;
}

export function extractWallapop(html: string, sourceUrl: string): WallapopPayload {
  const item = extractNextData(html);

  const description =
    typeof item?.description === 'string' ? item.description : item?.description?.original?.trim();

  const photos: WallapopPhoto[] = (item?.images ?? [])
    .map((img, i): WallapopPhoto | null => {
      const big = takeBest(img.urls);
      if (!big) return null;
      const thumb = img.urls?.small;
      return thumb !== undefined
        ? { position: i + 1, url: big, thumbnail: thumb }
        : { position: i + 1, url: big };
    })
    .filter((p: WallapopPhoto | null): p is WallapopPhoto => p !== null);

  const coords =
    item?.location?.latitude != null && item?.location?.longitude != null
      ? { lat: item.location.latitude, lng: item.location.longitude }
      : undefined;

  return {
    sourceId: item?.id ?? parseSourceIdFromUrl(sourceUrl),
    sourceUrl,
    title: item?.title?.original?.trim() ?? '',
    description,
    priceAmount: item?.price?.cash?.amount,
    currency: item?.price?.cash?.currency,
    brand: item?.brand ?? undefined,
    model: item?.model ?? undefined,
    condition: parseCondition(item?.condition?.value),
    shipping: parseShipping(item?.shipping),
    city: item?.location?.city,
    postalCode: item?.location?.postalCode,
    coordinates: coords,
    categoryPath: (item?.taxonomies ?? [])
      .map((t) => t.name)
      .filter((n): n is string => typeof n === 'string' && n.length > 0),
    photos,
    views: item?.views,
    favorites: item?.favorites,
  };
}
