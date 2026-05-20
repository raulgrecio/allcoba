/**
 * nuevoloquo extractor — HTML → NuevoloquoPayload.
 *
 * Profile URL: /escort/{province}/{slug}/{id}/
 * Phone is NOT extracted (obfuscated, revealed only via Playwright click).
 * All other fields come from static SSR HTML.
 */

import * as cheerio from 'cheerio';

import { parseSourceIdFromUrl } from './nuevoloquo.parsers.js';
import type { NuevoloquoParams, NuevoloquoPayload, NuevoloquoPhoto } from './nuevoloquo.types.js';

const extractDetailField = (
  $: cheerio.CheerioAPI,
  label: string,
): string | undefined => {
  const boxes = $('.details-box');
  for (let i = 0; i < boxes.length; i++) {
    const box = boxes.eq(i);
    if (box.find('span.legend').text().trim() === label) {
      return box.find('span:not(.legend)').first().text().trim() || undefined;
    }
  }
  return undefined;
};

export const extractNuevoloquo = (html: string, sourceUrl: string): NuevoloquoPayload => {
  const $ = cheerio.load(html);

  const sourceId = parseSourceIdFromUrl(sourceUrl);

  const title =
    $('h2.public-title').text().trim() ||
    $('h1.ad-name').text().trim() ||
    '';

  // nickname: primer token tras quitar emojis/símbolos iniciales
  const cleanTitle = title.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  const nickname =
    cleanTitle.split(/\s+/)[0]?.replace(/[,;:]+$/, '').trim() || cleanTitle || title;

  const bio =
    $('#description-container').text().trim() ||
    $('#description-container p').first().text().trim() ||
    undefined;

  const locationCity =
    $('.card-zone .location a').first().text().trim().replace(/\s*\(.*?\)/, '').trim() ||
    undefined;

  const languagesRaw = extractDetailField($, 'Idiomas');
  const languages = languagesRaw
    ? languagesRaw
        .split(',')
        .map((l) => l.trim())
        .filter(Boolean)
    : undefined;

  // Edad: campo estructurado si existe, si no se infiere del texto del bio
  const ageFromBio = bio?.match(/\b(1[89]|[2-5]\d)\s*años?\b/i)?.[1];

  const params: NuevoloquoParams = {
    age: extractDetailField($, 'Edad') ?? ageFromBio,
    gender: extractDetailField($, 'Género'),
    ethnicity: extractDetailField($, 'Etnia'),
    hairColor: extractDetailField($, 'Color de pelo'),
    weightKg: extractDetailField($, 'Peso'),
    heightCm: extractDetailField($, 'Altura'),
    measurements: extractDetailField($, 'Medidas (cm)'),
    serviceType: extractDetailField($, 'Disponible para'),
    languages,
    locationCity,
  };

  const photos: NuevoloquoPhoto[] = [];
  $('#carousel-img .carousel-item img').each((_, el) => {
    const src = $(el).attr('src') ?? $(el).attr('data-src') ?? '';
    if (src) photos.push({ src });
    return;
  });

  const isVerified =
    $('.verified-badge').length > 0 ||
    $('span.material-symbols-outlined:contains("verified_user")').length > 0;

  const hasVideo = $('#galleryVideo video').length > 0;

  return {
    sourceId,
    sourceUrl,
    title,
    nickname,
    bio,
    params,
    photos,
    isVerified,
    hasVideo,
  };
};
