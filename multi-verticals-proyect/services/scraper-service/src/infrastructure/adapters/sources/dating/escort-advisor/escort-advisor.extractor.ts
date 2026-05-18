/**
 * escort-advisor extractor — HTML → EscortAdvisorPayload.
 *
 * Profile URL: /escorts/{country}/{city}/{slug}/
 * Tech: PHP Custom, Cloudflare WAF.
 * Personal info: .personal-info .info-list li with "Label: value" format.
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

import {
  parseSourceIdFromUrl,
  parseEscortAdvisorPhone,
  parseFirstInt,
} from './escort-advisor.parsers.js';
import type {
  EscortAdvisorParams,
  EscortAdvisorPayload,
  EscortAdvisorPhoto,
} from './escort-advisor.types.js';

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

  const phoneHref =
    $('a[href^="tel:"]').first().attr('href') ??
    (() => {
      const dataNum = $('.toogleReview[data-number]').first().attr('data-number');
      return dataNum ? `tel:${dataNum}` : undefined;
    })();
  const phone = parseEscortAdvisorPhone(phoneHref);

  // Gallery: .gallery_tray img, .user_image, .banner_image
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

  const params: EscortAdvisorParams = {
    age: parseFirstInt(getPersonalInfoField($, 'Edad')),
    heightCm: parseFirstInt(getPersonalInfoField($, 'Altura')),
    weightKg: parseFirstInt(getPersonalInfoField($, 'Peso')),
    nationality: getPersonalInfoField($, 'Nacionalidad'),
    ethnicity: getPersonalInfoField($, 'Etnia'),
    services: services.length > 0 ? services : undefined,
  };

  return {
    sourceId,
    sourceUrl,
    title,
    nickname,
    bio,
    phone,
    params,
    photos,
    isVerified,
  };
};
