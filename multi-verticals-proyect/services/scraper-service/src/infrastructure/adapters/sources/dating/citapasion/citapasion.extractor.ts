/**
 * citapasion extractor — HTML → CitapasionPayload.
 *
 * Profile URL: /escorts/{numericId}
 * Tech: PHP + Slick slider, SSR profiles (listing is AJAX).
 * Phone is AJAX-revealed (data-href) but tel: href fallback works in static HTML.
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

import {
  parseSourceIdFromUrl,
  parseCitapasionPhone,
  parseCitapasionWhatsapp,
  parseFirstInt,
  parseBoolAttr,
  parseRatingScore,
  parseRatingCount,
  parseNicknameFromTitle,
} from './citapasion.parsers.js';
import type { CitapasionParams, CitapasionPayload, CitapasionPhoto } from './citapasion.types.js';

const extractDataRow = ($: CheerioAPI, label: string): string | undefined => {
  let value: string | undefined;
  $('.card-perfil.datos_interes li').each((_, el) => {
    if (value) return;
    const span = $(el).find('span').first();
    const lbl = span.text().replace(':', '').trim();
    if (lbl === label) {
      value = $(el).text().replace(span.text(), '').trim() || undefined;
    }
    return;
  });
  return value;
};

export const extractCitapasion = (html: string, sourceUrl: string): CitapasionPayload => {
  const $ = cheerio.load(html);

  const sourceId = parseSourceIdFromUrl(sourceUrl);

  const rawTitle =
    $('h1').first().text().trim() ||
    $('title').first().text().trim() ||
    '';

  const title = rawTitle.split('|')[0]?.trim() ?? rawTitle;
  const nickname = parseNicknameFromTitle(rawTitle) || extractDataRow($, 'Nombre');

  const bio = $('.card-perfil.sobre__mi .text__description').text().trim() || undefined;

  // Phone: AJAX-revealed in data-href, fallback a[href^="tel:"]
  const phoneDataHref = $('[data-href^="tel:"]').first().attr('data-href');
  const phoneTelHref = $('a[href^="tel:"]').first().attr('href');
  const phone = parseCitapasionPhone(phoneDataHref) ?? parseCitapasionPhone(phoneTelHref);

  // WhatsApp: data-accion contains wa.me URL, fallback a[href*="wa.me"]
  const waDataAccion = $('[data-accion*="wa.me"]').first().attr('data-accion');
  const waHref = $('a[href*="wa.me"]').first().attr('href');
  const whatsappPhone = parseCitapasionWhatsapp(waDataAccion) ?? parseCitapasionWhatsapp(waHref);

  // Gallery: lightbox anchors contain full-size image URL
  const photos: CitapasionPhoto[] = [];
  $('.slider-fichas a[data-fslightbox="gallery"]').each((_, el) => {
    const src = $(el).attr('href') ?? $(el).find('img').attr('src') ?? '';
    if (src && !photos.some((p) => p.src === src)) photos.push({ src });
    return;
  });

  // OG image fallback
  if (photos.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) photos.push({ src: ogImg });
  }

  const languages: string[] = [];
  $('.card-perfil.datos_interes .idiomas__content .item p').each((_, el) => {
    const t = $(el).text().trim();
    if (t) languages.push(t);
    return;
  });

  const params: CitapasionParams = {
    age: parseFirstInt(extractDataRow($, 'Edad')),
    heightCm: parseFirstInt(extractDataRow($, 'Altura')),
    weightKg: parseFirstInt(extractDataRow($, 'Peso')),
    hairColor: extractDataRow($, 'Color de pelo'),
    hairLength: extractDataRow($, 'Tipo de pelo'),
    eyeColor: extractDataRow($, 'Color de ojos'),
    ethnicity: extractDataRow($, 'Etnia'),
    nationality: extractDataRow($, 'Nacionalidad'),
    languages: languages.length > 0 ? languages : undefined,
    tattoos: parseBoolAttr(extractDataRow($, 'Tatuajes')),
    piercings: parseBoolAttr(extractDataRow($, 'Piercings')),
    smoker: parseBoolAttr(extractDataRow($, 'Fumador@')),
    city: extractDataRow($, 'Ciudad'),
    zone: extractDataRow($, 'Zona'),
  };

  const ratingStyle = $('.reviews .stars').first().attr('style');
  const ratingCountText = $('.reviews span').first().text().trim();
  const ratingScore = parseRatingScore(ratingStyle);
  const siteRating =
    ratingScore !== undefined
      ? { score: ratingScore, count: parseRatingCount(ratingCountText) ?? 0 }
      : undefined;

  return {
    sourceId,
    sourceUrl,
    title,
    nickname,
    bio,
    phone,
    whatsappPhone,
    params,
    photos,
    siteRating,
  };
};
