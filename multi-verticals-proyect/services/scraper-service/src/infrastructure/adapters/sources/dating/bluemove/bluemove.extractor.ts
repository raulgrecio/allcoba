/**
 * bluemove extractor — HTML → BluemovePayload.
 *
 * Profile URL: /{city}/escorts/#{numericId}
 * Tech: Bootstrap 5 / Swiper, SSR (despite JS age gate).
 * ID comes from URL hash fragment.
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

import {
  parseSourceIdFromUrl,
  parseCityFromUrl,
  parseBluemovePhone,
  parseBluemoveWhatsapp,
  parseTelegramHandle,
  parseInstagramHandle,
  parseNicknameFromAlt,
  parseFirstInt,
  parseBoolNotNo,
  stripProvince,
} from './bluemove.parsers.js';
import type { BluemoveParams, BluemovePayload, BluemovePhoto } from './bluemove.types.js';

const CONTACTS = new Set(['whatsapp', 'telegram', 'instagram', 'tiktok', 'twitter', 'x', 'onlyfans', 'fansly']);
const PAYMENTS = new Set(['bizum', 'efectivo', 'tarjeta', 'transferencia', 'paypal', 'crypto']);
const SERVICE_LOCATIONS = new Set(['incall', 'outcall', 'domicilios', 'hoteles', 'apartamento', 'pisos', 'casa']);

const extractFichaDataRow = ($: CheerioAPI, label: string): string | undefined => {
  let value: string | undefined;
  $('#fichaContent .ficha-data-row').each((_, el) => {
    if (value) return;
    const lbl = $(el).find('.ficha-data-row-label span').text().trim();
    if (lbl === label) {
      value = $(el).find('.ficha-data-row-value').text().trim() || undefined;
    }
    return;
  });
  return value;
};

export const extractBluemove = (html: string, sourceUrl: string): BluemovePayload => {
  const $ = cheerio.load(html);

  const sourceId = parseSourceIdFromUrl(sourceUrl);

  // Nickname + title from first slider image alt
  const firstImgAlt = $('#fichaContent .ficha-images-slider img').first().attr('alt');
  const nickname =
    parseNicknameFromAlt(firstImgAlt) ??
    (() => {
      const h4 = $('#fichaContent #services h4').text().trim();
      const m = h4.match(/Servicios de (.+)/i);
      return m ? m[1]!.trim() : undefined;
    })();

  const title = firstImgAlt?.trim() || nickname || '';

  const bio = $('#fichaContent .ad-description-text').text().trim() || undefined;

  const phoneHref = $('#phoneCallSection a[href^="tel:"]').first().attr('href');
  const phone = parseBluemovePhone(phoneHref);

  const waHref = $('#phoneCallSection a[href*="wa.me"]').first().attr('href');
  const whatsappPhone = parseBluemoveWhatsapp(waHref);

  const tgHref = $('#phoneCallSection a[href*="t.me"]').first().attr('href');
  const telegram = parseTelegramHandle(tgHref);

  const igHref = $('#fichaContent .ficha-social-media a[href*="instagram.com"]').first().attr('href');
  const instagram = parseInstagramHandle(igHref);

  // Photos
  const photos: BluemovePhoto[] = [];
  $('#fichaContent .ficha-images-slider img').each((_, el) => {
    const src = $(el).attr('src') ?? $(el).attr('data-src') ?? '';
    if (src && !photos.some((p) => p.src === src)) photos.push({ src });
    return;
  });
  if (photos.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) photos.push({ src: ogImg });
  }

  const isVerified =
    $('#fichaContent .ficha-top-line img[src*="verificada"]').length > 0 ||
    $('#fichaContent .ficha-verified-images-info').length > 0;

  // Services / extra-info
  const services: string[] = [];
  $('#fichaContent #services ul:not(.not-services) li a').each((_, el) => {
    const name = $(el).text().trim();
    if (name) services.push(name);
    return;
  });

  const paymentMethods: string[] = [];
  const serviceLocations: string[] = [];
  $('#fichaContent #extra-info .not-services li a').each((_, el) => {
    const raw = $(el).text().trim();
    const key = raw.toLowerCase();
    if (CONTACTS.has(key)) return;
    if (PAYMENTS.has(key)) paymentMethods.push(raw);
    else if (SERVICE_LOCATIONS.has(key)) serviceLocations.push(raw);
    return;
  });

  const rawCity = extractFichaDataRow($, 'Ciudad');
  const city =
    stripProvince(rawCity) ??
    parseCityFromUrl(sourceUrl);

  const langRaw = extractFichaDataRow($, 'Idiomas');
  const languages = langRaw
    ? langRaw.split(',').map((l) => l.trim()).filter(Boolean)
    : undefined;

  const params: BluemoveParams = {
    age: parseFirstInt(extractFichaDataRow($, 'Edad')),
    heightCm: parseFirstInt(extractFichaDataRow($, 'Estatura') ?? extractFichaDataRow($, 'Altura')),
    weightKg: parseFirstInt(extractFichaDataRow($, 'Peso')),
    hairColor: extractFichaDataRow($, 'Color de pelo') ?? extractFichaDataRow($, 'Cabello'),
    eyeColor: extractFichaDataRow($, 'Color de ojos'),
    breastSize: extractFichaDataRow($, 'Pecho'),
    pubicHair: extractFichaDataRow($, 'Pubis'),
    nationality: extractFichaDataRow($, 'Nacionalidad'),
    languages,
    tattoos: parseBoolNotNo(extractFichaDataRow($, 'Tatuajes')),
    piercings: parseBoolNotNo(extractFichaDataRow($, 'Piercings')),
    city,
    zone: extractFichaDataRow($, 'Areas'),
    services: services.length > 0 ? services : undefined,
    paymentMethods: paymentMethods.length > 0 ? paymentMethods : undefined,
    serviceLocations: serviceLocations.length > 0 ? serviceLocations : undefined,
  };

  return {
    sourceId,
    sourceUrl,
    title,
    nickname,
    bio,
    phone,
    whatsappPhone,
    telegram,
    instagram,
    params,
    photos,
    isVerified,
  };
};
