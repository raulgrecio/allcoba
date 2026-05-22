/**
 * escort-advisor extractor — HTML → EscortAdvisorPayload.
 *
 * Profile URL: /escorts/{country}/{city}/{slug}/
 * Tech: PHP custom, Cloudflare WAF. No __NEXT_DATA__.
 * Phone: a[href^="tel:"] exists. data-number = profile ID (not phone).
 * WhatsApp: onclick="whatsApp(+PHONE, ...)".
 */

import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type {
  EscortAdvisorParams,
  EscortAdvisorPayload,
  EscortAdvisorPhoto,
} from './escort-advisor.types.js';
import {
  parseEscortAdvisorPhone,
  parseFirstInt,
  parseSourceIdFromUrl,
} from './escort-advisor.parsers.js';

const getPersonalInfoField = ($: CheerioAPI, label: string): string | undefined => {
  const text = $('.personal-info .info-list li')
    .filter((_, el) => $(el).text().includes(label))
    .text()
    .split(':')[1]
    ?.trim();
  return text || undefined;
};

export const extractEscortAdvisor = (html: string, sourceUrl: string): EscortAdvisorPayload => {
  const $ = cheerio.load(html);

  const sourceId = parseSourceIdFromUrl(sourceUrl);

  const title = $('.username h2').first().text().trim() || '';
  const nickname = title || undefined;

  const bio = $('.data-container .content').text().trim() || undefined;

  // Phone via tel: href. data-number fallback is the profile ID (not a real phone).
  const phoneHref = $('a[href^="tel:"]').first().attr('href');
  const phone = parseEscortAdvisorPhone(phoneHref);

  // WhatsApp phone from onclick="whatsApp(+PHONE, ...)"
  const whatsappOnclick = $('[onclick*="whatsApp"]').first().attr('onclick') ?? '';
  const whatsappMatch = /whatsApp\((\+\d+)/.exec(whatsappOnclick);
  const whatsapp = whatsappMatch?.[1] ?? undefined;

  const photos: EscortAdvisorPhoto[] = [];
  $('.gallery_tray img, .user_image, .banner_image').each((_, el) => {
    const src = $(el).attr('src') ?? $(el).attr('data-src') ?? '';
    if (src && !photos.some((p) => p.src === src)) photos.push({ src });
    return;
  });
  if (photos.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) photos.push({ src: ogImg });
  }

  const isVerified = $('.verified-badge, .icon-ok-circled').length > 0;

  const services: string[] = [];
  $('.preferences .info-list li').each((_, el) => {
    const name = $(el).text().trim();
    if (name) services.push(name);
    return;
  });

  // Numeric rating: "4,86" in .pdp_rating_component .tx (comma decimal separator)
  const ratingText = $('.pdp_rating_component .tx').first().text().trim();
  const reviewsRating = ratingText ? parseFloat(ratingText.replace(',', '.')) || undefined : undefined;

  // Reviews count: .review.when-closed divs present in HTML (subset of total)
  const reviewsCount = $('.review.when-closed').length || undefined;

  const params: EscortAdvisorParams = {
    age: parseFirstInt(getPersonalInfoField($, 'Edad')),
    heightCm: parseFirstInt(getPersonalInfoField($, 'Altura')),
    weightKg: parseFirstInt(getPersonalInfoField($, 'Peso')),
    nationality: getPersonalInfoField($, 'Nacionalidad'),
    ethnicity: getPersonalInfoField($, 'Etnia'),
    services: services.length > 0 ? services : undefined,
    city: getPersonalInfoField($, 'Ciudad'),
    priceText: getPersonalInfoField($, 'Precio'),
    meetingRaw: getPersonalInfoField($, 'Recibo'),
    bodyType: getPersonalInfoField($, 'Figura'),
    eyeColor: getPersonalInfoField($, 'Ojos'),
    hairColor: getPersonalInfoField($, 'Cabellos'),
  };

  return {
    sourceId,
    sourceUrl,
    title,
    nickname,
    bio,
    phone,
    whatsapp,
    params,
    photos,
    isVerified,
    reviewsRating,
    reviewsCount,
  };
};
