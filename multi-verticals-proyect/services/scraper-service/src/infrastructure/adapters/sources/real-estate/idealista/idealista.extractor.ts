import * as cheerio from 'cheerio';

import type { IdealistaPayload, IdealistaPhoto } from './idealista.types.js';
import {
  parseBuildYear,
  parseEnergyRatingFromIconClass,
  parseFirstInteger,
  parseFloor,
  parseListingType,
  parsePrice,
  parsePropertyType,
  parseSourceIdFromUrl,
  parseStreetFromTitle,
  parseSubtitle,
} from './idealista.parsers.js';

const CDN_PHOTO_REGEX =
  /https:\/\/img\d+\.idealista\.com\/blur\/WEB_DETAIL\/0\/id\.pro\.es\.image\.master\/[a-f0-9/]+\/(\d+)\.jpg/g;

function extractPhotos(html: string): IdealistaPhoto[] {
  const seen = new Map<string, IdealistaPhoto>();
  let position = 1;
  for (const match of html.matchAll(CDN_PHOTO_REGEX)) {
    const url = match[0];
    const photoId = match[1] ?? url;
    if (!seen.has(photoId)) {
      seen.set(photoId, { position: position++, url });
    }
  }
  return [...seen.values()];
}

export function extractIdealista(html: string, sourceUrl: string): IdealistaPayload {
  const $ = cheerio.load(html);

  const title = $('.main-info__title-main').first().text().trim();
  const subtitle = $('.main-info__title-minor').first().text().trim();
  const priceText = $('.info-data-price').first().text().trim();
  const description =
    $('.adCommentsLanguageSelector, .comment-text').first().text().trim() ||
    $('meta[property="og:description"]').attr('content')?.trim();

  // Aggregate text from the structured feature lists to run regex against.
  const featuresText: string[] = [];
  $('.details-property_features li, .info-features span').each((_, el) => {
    const t = $(el).text().trim();
    if (t) featuresText.push(t);
  });
  const featuresJoined = featuresText.join(' \n ');

  const surfaceM2 = parseFirstInteger(featuresJoined, /(\d+)\s*m²/);
  const roomsCount =
    parseFirstInteger(featuresJoined, /(\d+)\s*habitac/i) ??
    parseFirstInteger(featuresJoined, /(\d+)\s*hab\b/i);
  const bathroomsCount = parseFirstInteger(featuresJoined, /(\d+)\s*baño/i);

  const floorRaw = featuresText.find((t) => /planta/i.test(t)) ?? '';
  const floor = parseFloor(floorRaw);
  const buildYearRaw = featuresText.find((t) => /construido en/i.test(t)) ?? '';
  const buildYear = parseBuildYear(buildYearRaw);

  const hasElevator = /ascensor/i.test(featuresJoined);
  const hasAirConditioning = /aire\s+acond/i.test(featuresJoined);
  const hasHeating = /calefacc/i.test(featuresJoined);
  const hasParking = /parking|garaje|plaza\s+de/i.test(featuresJoined);
  const hasFurnished = /amueblad/i.test(featuresJoined);
  const hasTerrace = /terraza/i.test(featuresJoined);
  const hasGarden = /jard[íi]n/i.test(featuresJoined);
  const hasPool = /piscina/i.test(featuresJoined);
  const hasStorageRoom = /trastero/i.test(featuresJoined);

  // Energy ratings live in two consecutive list items inside
  // <h2>Certificado energético</h2>. The icon class encodes the letter.
  const energyIcons: string[] = [];
  $(
    '.details-property_features li .icon-energy-c-a, ' +
      '.details-property_features li .icon-energy-c-b, ' +
      '.details-property_features li .icon-energy-c-c, ' +
      '.details-property_features li .icon-energy-c-d, ' +
      '.details-property_features li .icon-energy-c-e, ' +
      '.details-property_features li .icon-energy-c-f, ' +
      '.details-property_features li .icon-energy-c-g',
  ).each((_, el) => {
    const classAttr = $(el).attr('class') ?? '';
    energyIcons.push(classAttr);
  });
  const energyConsumptionRating = parseEnergyRatingFromIconClass(energyIcons[0]);
  const energyEmissionsRating = parseEnergyRatingFromIconClass(energyIcons[1]);

  const subtitleParts = parseSubtitle(subtitle);

  return {
    sourceId: parseSourceIdFromUrl(sourceUrl),
    sourceUrl,
    title,
    description,
    listingType: parseListingType(title),
    propertyType: parsePropertyType(title),
    priceAmount: parsePrice(priceText),
    priceMode: parseListingType(title) === 'rent' ? 'per-month' : 'total',
    city: subtitleParts.city,
    neighborhood: subtitleParts.neighborhood,
    street: parseStreetFromTitle(title),
    surfaceM2,
    roomsCount,
    bathroomsCount,
    floor,
    buildYear,
    hasElevator: hasElevator || undefined,
    hasAirConditioning: hasAirConditioning || undefined,
    hasHeating: hasHeating || undefined,
    hasParking: hasParking || undefined,
    hasFurnished: hasFurnished || undefined,
    hasTerrace: hasTerrace || undefined,
    hasGarden: hasGarden || undefined,
    hasPool: hasPool || undefined,
    hasStorageRoom: hasStorageRoom || undefined,
    energyConsumptionRating,
    energyEmissionsRating,
    photos: extractPhotos(html),
  };
}
