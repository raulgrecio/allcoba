import {
  parseBodyType,
  parseColor,
  parseCondition,
  parseEnvironmentalLabel,
  parseFuelType,
  parseSourceIdFromUrl,
  parseTransmission,
} from './coches-net.parsers.js';
import type { CochesNetPayload, CochesNetPhoto } from './coches-net.types.js';

interface CochesNetAd {
  id?: string | number;
  url?: string;
  title?: string;
  description?: string;
  price?: number;
  km?: number;
  year?: number;
  fuelType?: string;
  transmissionType?: string;
  bodyTypeId?: number;
  color?: string;
  environmentalLabel?: string;
  make?: string;
  model?: string;
  version?: string;
  province?: string;
  photos?: string[];
  isProfessional?: boolean;
  warrantyMonths?: number;
  hasOfficialWarranty?: boolean;
  offerType?: { id?: number };
}

interface CochesNetInitialProps {
  ad?: CochesNetAd;
}

function decodeJsStringLiteral(literal: string): string {
  return Function(`"use strict"; return ${literal};`)() as string;
}

function scanJsStringLiteral(text: string, start: number, quote: string): number {
  let i = start + 1;
  while (i < text.length) {
    const c = text[i];
    if (c === '\\') {
      i += 2;
      continue;
    }
    if (c === quote) return i;
    i++;
  }
  return -1;
}

function extractInitialProps(html: string): CochesNetInitialProps | null {
  const marker = 'window.__INITIAL_PROPS__ = JSON.parse(';
  const markerIdx = html.indexOf(marker);
  if (markerIdx === -1) return null;

  let quoteIdx = markerIdx + marker.length;
  while (quoteIdx < html.length && html[quoteIdx] !== "'" && html[quoteIdx] !== '"') quoteIdx++;
  if (quoteIdx >= html.length) return null;

  const quote = html[quoteIdx] as string;
  const endIdx = scanJsStringLiteral(html, quoteIdx, quote);
  if (endIdx === -1) return null;

  const literal = html.slice(quoteIdx, endIdx + 1);
  try {
    const jsonString = decodeJsStringLiteral(literal);
    return JSON.parse(jsonString) as CochesNetInitialProps;
  } catch {
    return null;
  }
}

export function extractCochesNet(html: string, sourceUrl: string): CochesNetPayload {
  const sourceId = parseSourceIdFromUrl(sourceUrl);
  const initial = extractInitialProps(html);
  const ad = initial?.ad;

  const photos: CochesNetPhoto[] = (ad?.photos ?? [])
    .filter((u): u is string => typeof u === 'string')
    .map((url, i) => ({ position: i + 1, url }));

  return {
    sourceId: ad?.id != null ? String(ad.id) : sourceId,
    sourceUrl,
    title: ad?.title?.trim() ?? '',
    description: ad?.description?.trim(),
    priceAmount: ad?.price ?? 0,
    make: ad?.make,
    model: ad?.model,
    version: ad?.version,
    year: ad?.year,
    kilometers: ad?.km,
    fuelType: parseFuelType(ad?.fuelType),
    transmission: parseTransmission(ad?.transmissionType),
    bodyType: parseBodyType(ad?.bodyTypeId),
    color: parseColor(ad?.color),
    environmentalLabel: parseEnvironmentalLabel(ad?.environmentalLabel),
    condition: parseCondition(ad?.offerType?.id, ad?.km),
    province: ad?.province,
    photos,
    isProfessional: ad?.isProfessional ?? false,
    warrantyMonths: ad?.warrantyMonths,
    hasOfficialWarranty: ad?.hasOfficialWarranty ?? false,
  };
}
