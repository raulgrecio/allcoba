/**
 * EuroGirlsEscort extractor — HTML → EuroGirlsEscortPayload (pure, no I/O).
 *
 * Unlike TopEscortBabes (JSON in `window.profileData`), this site is pure
 * SSR HTML. The extractor drives Cheerio selectors and produces a typed
 * intermediate payload. All parsing of string values (dates, dimensions,
 * slugs) is delegated to `eurogirlsescort.parsers.ts`.
 */

import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type {
  EuroGirlsEscortBadge,
  EuroGirlsEscortMapData,
  EuroGirlsEscortParams,
  EuroGirlsEscortPayload,
  EuroGirlsEscortPhone,
  EuroGirlsEscortPhoto,
  EuroGirlsEscortRate,
  EuroGirlsEscortReview,
  EuroGirlsEscortService,
  EuroGirlsEscortWorkingTime,
} from './eurogirlsescort.types.js';
import { parseEGEAmount, parseEGELanguages } from './eurogirlsescort.parsers.js';

// ============================================================================
// ID / URL
// ============================================================================

const extractSourceUrl = ($: CheerioAPI): string => {
  return $('link[rel="canonical"]').attr('href') ?? '';
};

/** Last numeric path segment from canonical URL or data-id on phone element. */
const extractSourceId = ($: CheerioAPI, sourceUrl: string): string => {
  const dataId = $('a.js-phone[data-id]').attr('data-id');
  if (dataId) return dataId;
  const segments = sourceUrl.split('/').filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    if (/^\d+$/.test(segments[i] ?? '')) return segments[i]!;
  }
  return '';
};

// ============================================================================
// Nickname
// ============================================================================

/** "Sofia, independent" → "Sofia". Strips everything after first comma. */
const extractNickname = ($: CheerioAPI): string => {
  const raw = $('.description h1').first().text().trim();
  return raw.split(',')[0]?.trim() ?? raw;
};

// ============================================================================
// Bio
// ============================================================================

const extractBio = ($: CheerioAPI): string | undefined => {
  const text = $('.description p.js-more .less')
    .first()
    .text()
    // Strip zero-width and invisible Unicode chars used as spam guards
    .replace(/\u200b|\u200c|\u200d|\u2060|\ufeff/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text || undefined;
};

// ============================================================================
// Last login
// ============================================================================

const extractLastLoginDate = ($: CheerioAPI): string | undefined => {
  return $('#js-last-login').first().text().trim() || undefined;
};

// ============================================================================
// Badges & verified
// ============================================================================

const extractBadges = ($: CheerioAPI): EuroGirlsEscortBadge[] => {
  const badges: EuroGirlsEscortBadge[] = [];
  $('.badges .badge').each((_, el) => {
    const classes = $(el).attr('class') ?? '';
    const typeMatch = classes.match(/badge-([^\s]+)/);
    const type = typeMatch?.[1] ?? 'unknown';
    // Label text is the first text node before any tooltip span
    const label = $(el).clone().find('.tooltip').remove().end().text().trim();
    if (type !== 'unknown' || label) {
      badges.push({ type, label });
    }
  });
  return badges;
};

const extractVerified = ($: CheerioAPI): boolean => {
  return $('.verified').length > 0;
};

// ============================================================================
// Params (.params div key-value pairs)
// ============================================================================

const hrefToSlug = (href: string | undefined): string | undefined => {
  if (!href) return undefined;
  const segments = href.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? undefined;
};

const extractParams = ($: CheerioAPI): EuroGirlsEscortParams => {
  const params: EuroGirlsEscortParams = {};
  const labelMap: Record<string, (strong: ReturnType<CheerioAPI>) => void> = {
    'gender:': (s) => {
      params.gender = s.text().trim() || undefined;
    },
    'age:': (s) => {
      params.age = s.text().trim() || undefined;
    },
    'location:': (s) => {
      const links = s.find('a');
      if (links.length >= 1) {
        params.locationCityName = $(links.get(0)).text().trim() || undefined;
        params.locationCitySlug = hrefToSlug($(links.get(0)).attr('href'));
      }
      if (links.length >= 2) {
        params.locationCountryName = $(links.get(1)).text().trim() || undefined;
        params.locationCountrySlug = hrefToSlug($(links.get(1)).attr('href'));
      }
    },
    'city part:': (s) => {
      const firstLink = s.find('a').first();
      params.cityPart =
        firstLink.text().trim() ||
        s.clone().find('.tooltip').remove().end().text().trim() ||
        undefined;
      params.cityPartSlug = hrefToSlug(firstLink.attr('href'));
    },
    'eyes:': (s) => {
      params.eyes = s.text().trim() || undefined;
    },
    'hair color:': (s) => {
      params.hairColor = s.text().trim() || undefined;
    },
    'hair lenght:': (s) => {
      params.hairLength = s.text().trim() || undefined;
    },
    'hair length:': (s) => {
      params.hairLength = s.text().trim() || undefined;
    },
    'pubic hair:': (s) => {
      params.pubicHair = s.text().trim() || undefined;
    },
    'bust size:': (s) => {
      params.bustSize = s.text().trim() || undefined;
    },
    'bust type:': (s) => {
      params.bustType = s.text().trim() || undefined;
    },
    'travel:': (s) => {
      params.travel = s.text().trim() || undefined;
    },
    'weight:': (s) => {
      params.weight = s.text().trim() || undefined;
    },
    'height:': (s) => {
      params.height = s.text().trim() || undefined;
    },
    'ethnicity:': (s) => {
      params.ethnicity = s.text().trim() || undefined;
    },
    'orientation:': (s) => {
      params.orientation = s.text().trim() || undefined;
    },
    'smoker:': (s) => {
      params.smoker = s.text().trim() || undefined;
    },
    'tattoo:': (s) => {
      params.tattoo = s.text().trim() || undefined;
    },
    'piercing:': (s) => {
      params.piercing = s.text().trim() || undefined;
    },
    'nationality:': (s) => {
      params.nationality = s.text().trim() || undefined;
    },
    'languages:': (s) => {
      const raw = s.text().trim();
      params.languages = parseEGELanguages(raw);
    },
    'services:': (s) => {
      params.servicesText = s.find('.js-more .less').text().trim() || s.text().trim() || undefined;
    },
    'available for:': (s) => {
      params.availableFor = s.text().trim() || undefined;
    },
    'meeting with:': (s) => {
      params.meetingWith = s.text().trim() || undefined;
    },
  };

  $('.params > div').each((_, el) => {
    const labelRaw = $(el).find('span').first().text().toLowerCase().trim();
    const strong = $(el).find('strong').first();
    const handler = labelMap[labelRaw];
    if (handler) handler(strong);
  });

  return params;
};

// ============================================================================
// Phones
// ============================================================================

const extractPhones = ($: CheerioAPI): EuroGirlsEscortPhone[] => {
  const phones: EuroGirlsEscortPhone[] = [];

  $('#js-phone .js-phone-item').each((_, item) => {
    const a = $(item).find('a.js-phone[href^="tel:"]');
    if (!a.length) return;
    const href = a.attr('href') ?? '';
    const number = href.replace('tel:', '');
    const dataId = a.attr('data-id');
    const dataPhone = a.attr('data-phone');

    const flagClass = $(item).find('[class*="flag-icon-"]').attr('class') ?? '';
    const flagMatch = flagClass.match(/flag-icon-([a-z]{2})/);
    const flagCountryCode = flagMatch?.[1];

    const hasWhatsapp = $(item).find('i.icon-whatsapp').length > 0;

    phones.push({
      href,
      number,
      ...(dataId ? { dataId } : {}),
      ...(dataPhone ? { dataPhone } : {}),
      hasWhatsapp,
      ...(flagCountryCode ? { flagCountryCode } : {}),
    });
  });

  return phones;
};

// ============================================================================
// Photos
// ============================================================================

const extractPhotos = ($: CheerioAPI): EuroGirlsEscortPhoto[] => {
  const seen = new Set<string>();
  const photos: EuroGirlsEscortPhoto[] = [];

  $('#js-gallery a.js-gallery[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (!href || seen.has(href)) return;
    seen.add(href);
    const title = $(el).attr('title') ?? '';
    photos.push({ href, title });
  });

  return photos;
};

// ============================================================================
// Map data
// ============================================================================

const extractMapData = ($: CheerioAPI): EuroGirlsEscortMapData | undefined => {
  const el = $('#incall-map');
  if (!el.length) return undefined;
  const lat = parseFloat(el.attr('data-lat') ?? '');
  const lng = parseFloat(el.attr('data-lng') ?? '');
  const zoom = parseInt(el.attr('data-zoom') ?? '14', 10);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { lat, lng, zoom };
};

// ============================================================================
// Working time
// ============================================================================

const extractWorkingTime = ($: CheerioAPI): EuroGirlsEscortWorkingTime => {
  if ($('.working-time .nonstop').length > 0) {
    return { nonstop: true };
  }
  const scheduleText = $('.working-time')
    .text()
    .replace(/Working time/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { nonstop: false, scheduleText: scheduleText || undefined };
};

// ============================================================================
// Rates
// ============================================================================

const extractRates = ($: CheerioAPI): EuroGirlsEscortRate[] => {
  const rates: EuroGirlsEscortRate[] = [];

  $('.rates table tbody tr').each((_, row) => {
    const duration = $(row).find('th').first().text().trim();
    if (!duration) return;

    const parseCell = (
      td: ReturnType<CheerioAPI>,
    ): { amount?: number; currency?: string; eurAmount?: number } => {
      if (td.find('i.icon-close').length > 0) return {};
      const mainText = td
        .clone()
        .find('small')
        .remove()
        .end()
        .text()
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const eurText = td
        .find('small')
        .text()
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const main = parseEGEAmount(mainText);
      if (!main) return {};

      const eur = parseEGEAmount(eurText);
      const eurAmount = eur?.currency === 'EUR' ? eur.amount : undefined;

      return {
        amount: main.amount,
        currency: main.currency,
        ...(eurAmount !== undefined ? { eurAmount } : {}),
      };
    };

    const incall = parseCell($(row).find('td').eq(0));
    const outcall = parseCell($(row).find('td').eq(1));

    rates.push({
      duration,
      ...(incall.amount !== undefined
        ? {
            incallAmount: incall.amount,
            incallCurrency: incall.currency,
            ...(incall.eurAmount !== undefined ? { incallEurAmount: incall.eurAmount } : {}),
          }
        : {}),
      ...(outcall.amount !== undefined
        ? {
            outcallAmount: outcall.amount,
            outcallCurrency: outcall.currency,
            ...(outcall.eurAmount !== undefined ? { outcallEurAmount: outcall.eurAmount } : {}),
          }
        : {}),
    });
  });

  return rates;
};

// ============================================================================
// Services
// ============================================================================

const extractServices = ($: CheerioAPI): EuroGirlsEscortService[] => {
  const services: EuroGirlsEscortService[] = [];

  $('.services table tbody tr').each((_, row) => {
    const thClone = $(row).find('th').first().clone();
    const note = thClone.find('.service-note').text().trim() || undefined;
    thClone.find('.service-note').remove();
    const name = thClone.text().trim();
    if (!name) return;

    const included = $(row).find('td').eq(0).find('i.icon-check').length > 0;
    const extra = $(row).find('td').eq(1).find('i.icon-check').length > 0;

    services.push({ name, ...(note ? { note } : {}), included, extra });
  });

  return services;
};

// ============================================================================
// Reviews
// ============================================================================

const extractReviews = ($: CheerioAPI): EuroGirlsEscortReview[] => {
  const reviews: EuroGirlsEscortReview[] = [];

  $('.reviews #reviews-content .item').each((_, el) => {
    const author = $(el).find('h3 strong').text().trim();
    if (!author) return;

    const date = $(el).find('h3 span').first().text().trim();
    const rating = $(el).find('h3 .stars i.full').length;
    const text = $(el).find('.more-text').text().trim();

    const cityRaw = $(el)
      .find('.nowrap')
      .filter((_, e) => /Ciudad|City/i.test($(e).text()))
      .text();
    const city =
      cityRaw
        .replace(/Ciudad\s*\/?\s*País:|City\s*\/?\s*Country:/gi, '')
        .replace(/&nbsp;/g, '')
        .trim()
        .replace(/\s+/g, ' ') || undefined;

    const dateRaw = $(el)
      .find('.nowrap')
      .filter((_, e) => /Fecha|Date/i.test($(e).text()))
      .text();
    const appointmentDate =
      dateRaw
        .replace(/Fecha de la cita|Appointment date/gi, '')
        .replace(/&nbsp;/g, '')
        .trim()
        .replace(/\s+/g, ' ') || undefined;

    const durRaw = $(el)
      .find('.nowrap')
      .filter((_, e) => /Duración|Duration/i.test($(e).text()))
      .text();
    const duration =
      durRaw
        .replace(/Duración de la cita:|Duration:/gi, '')
        .replace(/&nbsp;/g, '')
        .trim()
        .replace(/\s+/g, ' ') || undefined;

    reviews.push({
      author,
      date,
      rating,
      text,
      ...(city ? { city } : {}),
      ...(appointmentDate ? { appointmentDate } : {}),
      ...(duration ? { duration } : {}),
    });
  });

  return reviews;
};

// ============================================================================
// Public API
// ============================================================================

/** Extract from a Cheerio handle (when caller already loaded the HTML). */
export const extractEuroGirlsEscortFromCheerio = ($: CheerioAPI): EuroGirlsEscortPayload => {
  const sourceUrl = extractSourceUrl($);
  const sourceId = extractSourceId($, sourceUrl);

  return {
    sourceId,
    sourceUrl,
    nickname: extractNickname($),
    bio: extractBio($),
    lastLoginDate: extractLastLoginDate($),
    verified: extractVerified($),
    badges: extractBadges($),
    params: extractParams($),
    phones: extractPhones($),
    photos: extractPhotos($),
    mapData: extractMapData($),
    workingTime: extractWorkingTime($),
    rates: extractRates($),
    services: extractServices($),
    reviews: extractReviews($),
  };
};

/** Extract from a raw HTML string. */
export const extractEuroGirlsEscort = (html: string): EuroGirlsEscortPayload => {
  return extractEuroGirlsEscortFromCheerio(cheerio.load(html));
};
