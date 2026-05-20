/**
 * Chicasmalas extractor — Playwright-rendered Elementor HTML → ChicasmalasPayload.
 *
 * The static HTML has no profile data (Elementor JS-rendered).
 * Input must be the fully-rendered HTML captured by Playwright after clicking
 * the age gate and cookie consent buttons.
 */

import * as cheerio from 'cheerio';

import {
  parseSourceIdFromUrl,
  parsePhoneFromSlug,
  parseCityFromSlug,
  parseNicknameFromMetaTitle,
  parseChicasmalasPhone,
  parseChicasmalasWhatsapp,
  parseCityFromMapsUrl,
} from './chicasmalas.parsers.js';
import type { ChicasmalasPayload } from './chicasmalas.types.js';

/**
 * El perfil es Elementor: cada dato es un widget `heading` (`<h2>Edad.</h2>`)
 * seguido de un widget `text-editor` con el valor. Devuelve un mapa
 * etiqueta(minúsculas, sin punto final) → valor.
 */
function extractElementorFields($: cheerio.CheerioAPI): Map<string, string> {
  const fields = new Map<string, string>();
  let lastLabel: string | undefined;
  $('.elementor-widget-heading, .elementor-widget-text-editor').each((_, el) => {
    const node = $(el);
    if (node.hasClass('elementor-widget-heading')) {
      lastLabel = node.find('.elementor-heading-title').first().text().trim()
        .replace(/\.\s*$/, '')
        .toLowerCase() || undefined;
    } else if (lastLabel) {
      const value = node.text().trim();
      if (value) fields.set(lastLabel, value);
      lastLabel = undefined;
    }
  });
  return fields;
}

export function extractChicasmalas(html: string, sourceUrl: string): ChicasmalasPayload {
  const $ = cheerio.load(html);

  const fields = extractElementorFields($);
  const field = (label: string): string | undefined => fields.get(label);
  const intField = (label: string): number | undefined => {
    const m = field(label)?.match(/\d+/);
    const n = m ? parseInt(m[0], 10) : undefined;
    return n && n > 0 ? n : undefined;
  };
  // Altura: "1.68" → 168 cm · "168" → 168 cm
  const heightField = (): number | undefined => {
    const m = field('altura')?.match(/[\d.]+/);
    if (!m) return undefined;
    const v = parseFloat(m[0]);
    if (!Number.isFinite(v) || v <= 0) return undefined;
    return Math.round(v < 10 ? v * 100 : v);
  };

  const sourceId = parseSourceIdFromUrl(sourceUrl);
  const phoneFromSlug = parsePhoneFromSlug(sourceId);
  const cityFromSlug = parseCityFromSlug(sourceId);

  const metaTitle =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').first().text().trim() ||
    '';

  const nickname = parseNicknameFromMetaTitle(metaTitle);

  // Bio from Elementor "Descripción" widget
  const bio = field('descripción') ?? field('descripcion');

  // Phone from body tel: links
  let phone: string | undefined;
  $('a[href^="tel:"], a[href^="tel://"]').each((_, el) => {
    if (phone) return;
    const parsed = parseChicasmalasPhone($(el).attr('href') ?? '');
    if (parsed) phone = parsed;
  });
  phone = phone ?? phoneFromSlug;

  // WhatsApp
  let whatsappPhone: string | undefined;
  const waHref =
    $('a[href*="api.whatsapp.com"]').first().attr('href') ||
    $('a[href*="wa.me"]').first().attr('href');
  if (waHref) whatsappPhone = parseChicasmalasWhatsapp(waHref);

  // Gallery: Elementor lightbox links (full-size JPEG)
  const photos: Array<{ src: string }> = [];
  $('a.e-gallery-item[href*="/wp-content/uploads/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) photos.push({ src: href });
  });

  // Fallback: Elementor widget images
  if (photos.length === 0) {
    $('.elementor-widget-image img').each((_, el) => {
      const src =
        $(el).attr('data-lzl-src') || $(el).attr('data-src') || $(el).attr('src') || '';
      if (src.includes('/wp-content/uploads/') && !src.startsWith('data:')) {
        photos.push({ src });
      }
    });
  }

  // Fallback: og:image
  if (photos.length === 0) {
    const og = $('meta[property="og:image"]').attr('content');
    if (og) photos.push({ src: og });
  }

  // City: Google Maps iframe q param → first word (city name)
  let city: string | undefined;
  const mapsSrc = $('iframe[data-src*="maps.google.com"]').attr('data-src');
  if (mapsSrc) city = parseCityFromMapsUrl(mapsSrc);
  city = city ?? cityFromSlug;

  const servicesRaw = field('servicios');
  const services = servicesRaw
    ? servicesRaw
        .split(/[,·\n;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  const langRaw = field('idiomas');
  const languages = langRaw
    ? langRaw
        .split(/[,·\n;]+|\sy\s|\se\s/)
        .map((l) => l.trim())
        .filter(Boolean)
    : undefined;

  return {
    sourceId,
    sourceUrl,
    title: metaTitle || undefined,
    nickname,
    bio,
    phone,
    whatsappPhone,
    photos,
    city,
    isVerified: false,
    age: intField('edad'),
    nationality: field('nacionalidad'),
    heightCm: heightField(),
    weightKg: intField('peso'),
    languages: languages && languages.length > 0 ? languages : undefined,
    services: services && services.length > 0 ? services : undefined,
    rates: field('tarifa'),
  };
}
