import type { CheerioAPI } from 'cheerio';

import type { Vertical } from '@allcoba/shared-types';

import type { RawContact } from '#application/ports/source.port.js';

import type { SelectorDef } from '../base-source.adapter.js';
import type {
  DatingAttributes,
  EscortRate,
  EscortReview,
  EscortService,
} from './dating-attributes.js';
import { BaseSourceAdapter } from '../base-source.adapter.js';
import {
  parseFanslyHref,
  parseInstagramHref,
  parseOnlyfansHref,
  parseTelegramHref,
  parseTiktokHref,
  parseTwitterHref,
  parseWhatsappHref,
} from '../social-extractor.js';

/**
 * Base adapter for the Dating vertical.
 *
 * Provides shared logic for:
 * - Common selectors (title, nickname, social, etc.)
 * - Automatic phone extraction from common patterns.
 * - Social link normalization (WhatsApp, Telegram, OnlyFans, etc.)
 * - Attribute extraction (age, gender, ethnicity, etc.)
 * - Unified image gallery handling.
 *
 * Individual adapters should extend this class and provide site-specific selectors.
 */
export abstract class DatingBaseAdapter extends BaseSourceAdapter {
  readonly defaultVertical = 'dating' as const;

  protected static readonly baseSelectors = {
    independentBadge: {
      selector: '[class*="badge-independent"]',
      expectedType: 'exists',
      required: false,
    },
    agencyLink: {
      selector: 'span:contains("Agencia:") + strong a',
      expectedType: 'text',
      required: false,
    },
    verifiedBadge: {
      selector: '.verified i.icon-check',
      expectedType: 'exists',
      required: false,
    },
    whatsappLink: {
      selector: 'a[href*="wa.me"], a[href*="api.whatsapp.com"], a[href*="web.whatsapp.com"]',
      expectedType: 'exists',
      required: false,
    },
    telegramIcon: {
      selector: 'i.icon-telegram[data-telegram]',
      expectedType: 'exists',
      required: false,
    },
    telegramLink: {
      selector: 'a[href*="t.me"], a[href*="telegram.me"]',
      expectedType: 'exists',
      required: false,
    },
    instagramLink: {
      selector: 'a[href*="instagram.com/"]',
      expectedType: 'exists',
      required: false,
    },
    tiktokLink: {
      selector: 'a[href*="tiktok.com/"]',
      expectedType: 'exists',
      required: false,
    },
    twitterLink: {
      selector: 'a[href*="twitter.com/"], a[href*="x.com/"]',
      expectedType: 'exists',
      required: false,
    },
    onlyfansLink: {
      selector: 'a[href*="onlyfans.com/"]',
      expectedType: 'exists',
      required: false,
    },
    fanslyLink: {
      selector: 'a[href*="fansly.com/"]',
      expectedType: 'exists',
      required: false,
    },
    websiteIcon: {
      selector: 'i.icon-www',
      expectedType: 'exists',
      required: false,
    },
    incallMap: {
      selector: '#incall-map',
      expectedType: 'exists',
      required: false,
    },
    titleTag: {
      selector: 'title',
      expectedType: 'text',
      required: false,
    },
    h1Tag: {
      selector: 'h1',
      expectedType: 'text',
      required: false,
    },
    videoTag: {
      selector: 'video',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  protected override extractContacts(
    $: CheerioAPI,
    _attributes: Record<string, unknown>,
  ): RawContact[] {
    const contacts: RawContact[] = [];
    const whatsapp = this.extractWhatsapp($);
    if (whatsapp) contacts.push({ platform: 'whatsapp', handle: whatsapp });
    const telegram = this.extractTelegram($);
    if (telegram) contacts.push({ platform: 'telegram', handle: telegram });
    const instagram = this.extractInstagram($);
    if (instagram) contacts.push({ platform: 'instagram', handle: instagram });
    const tiktok = this.extractTiktok($);
    if (tiktok) contacts.push({ platform: 'tiktok', handle: tiktok });
    const twitter = this.extractTwitter($);
    if (twitter) contacts.push({ platform: 'twitter', handle: twitter });
    const onlyfans = this.extractOnlyfans($);
    if (onlyfans) contacts.push({ platform: 'onlyfans', handle: onlyfans });
    const fansly = this.extractFansly($);
    if (fansly) contacts.push({ platform: 'fansly', handle: fansly });
    const website = this.extractWebsite($);
    if (website) contacts.push({ platform: 'website', handle: website });
    return contacts;
  }

  protected extractPrice(_$: CheerioAPI): number | undefined {
    return undefined;
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const title = this.extractTitle($);
    const nickname = this.extractNickname($, url);

    return {
      nickname,
      title: title !== nickname ? title : undefined,
      age: this.extractParamInt($, 'Edad'),
      heightCm: this.parseFirstInt(this.extractParam($, 'Altura')),
      weightKg: this.parseFirstInt(this.extractParam($, 'Peso')),
      hairColor: this.extractParam($, 'Color del pelo'),
      hairLength: this.extractParam($, 'Longitud del pelo'),
      eyeColor: this.extractParam($, 'Ojos'),
      breastSize: this.extractParam($, 'Tamaño del pecho'),
      breastType: this.extractParam($, 'Tipo de pecho'),
      pubicHair: this.extractParam($, 'Vello púbico'),
      tattoos: this.extractParamBool($, 'Tatuaje'),
      piercings: this.extractParamBool($, 'Piercing'),

      ethnicity: this.extractParam($, 'Identidat étnica'),
      nationality: this.extractParam($, 'Nacionalidad'),
      orientation: this.extractParam($, 'Orientación'),
      smoker: this.extractParamBool($, 'Fumadora'),
      languages: this.extractParam($, 'Idiomas')
        ?.split(',')
        .map((l) => l.trim())
        .filter(Boolean),

      travelScope: this.extractParam($, 'Viaja'),
      serviceType: this.extractParam($, 'Disponible para'),
      clientType: this.extractParam($, 'Citas con'),

      independent: $(DatingBaseAdapter.baseSelectors.independentBadge.selector).length > 0,
      agency: $(DatingBaseAdapter.baseSelectors.agencyLink.selector).text().trim() || undefined,
      verified: $(DatingBaseAdapter.baseSelectors.verifiedBadge.selector).length > 0,
      badges: this.extractBadges($),

      rates: this.extractRates($),
      services: this.extractServices($),
      reviews: this.extractReviews($),
    };
  }

  protected extractNickname(_$: CheerioAPI, _url: string): string | undefined {
    return undefined;
  }

  protected override extractCity($: CheerioAPI): string | undefined {
    return this.extractParam($, 'Lugar');
  }

  protected override extractZone($: CheerioAPI): string | undefined {
    return this.extractParam($, 'Ciudad');
  }

  protected override extractCoordinates($: CheerioAPI): { lat: number; lng: number } | undefined {
    return this.extractMapCoordinates($);
  }

  protected extractWhatsapp($: CheerioAPI): string | undefined {
    const href = $(DatingBaseAdapter.baseSelectors.whatsappLink.selector).first().attr('href');
    return href ? parseWhatsappHref(href) : undefined;
  }

  protected extractTelegram($: CheerioAPI): string | undefined {
    const dataTg = $(DatingBaseAdapter.baseSelectors.telegramIcon.selector).attr('data-telegram');
    if (dataTg) return dataTg;
    const href = $(DatingBaseAdapter.baseSelectors.telegramLink.selector).first().attr('href');
    return href ? parseTelegramHref(href) : undefined;
  }

  protected extractInstagram($: CheerioAPI): string | undefined {
    const href = $(DatingBaseAdapter.baseSelectors.instagramLink.selector).first().attr('href');
    return href ? parseInstagramHref(href) : undefined;
  }

  protected extractTiktok($: CheerioAPI): string | undefined {
    const href = $(DatingBaseAdapter.baseSelectors.tiktokLink.selector).first().attr('href');
    return href ? parseTiktokHref(href) : undefined;
  }

  protected extractTwitter($: CheerioAPI): string | undefined {
    const href = $(DatingBaseAdapter.baseSelectors.twitterLink.selector).first().attr('href');
    return href ? parseTwitterHref(href) : undefined;
  }

  protected extractOnlyfans($: CheerioAPI): string | undefined {
    const href = $(DatingBaseAdapter.baseSelectors.onlyfansLink.selector).first().attr('href');
    return href ? parseOnlyfansHref(href) : undefined;
  }

  protected extractFansly($: CheerioAPI): string | undefined {
    const href = $(DatingBaseAdapter.baseSelectors.fanslyLink.selector).first().attr('href');
    return href ? parseFanslyHref(href) : undefined;
  }

  protected extractWebsite($: CheerioAPI): string | undefined {
    return (
      $(DatingBaseAdapter.baseSelectors.websiteIcon.selector).next('a').attr('href') || undefined
    );
  }

  protected extractParam($: CheerioAPI, label: string): string | undefined {
    const val = $(`.params span:contains("${label}:")`).next('strong').text().trim();
    return val || undefined;
  }

  protected extractParamInt($: CheerioAPI, label: string): number | undefined {
    return this.parseFirstInt(this.extractParam($, label));
  }

  protected extractParamBool($: CheerioAPI, label: string): boolean | undefined {
    const val = this.extractParam($, label)?.toLowerCase();
    if (!val) return undefined;
    return val === 'sí' || val === 'si';
  }

  protected parseFirstInt(text: string | undefined): number | undefined {
    if (!text) return undefined;
    const m = text.match(/(\d+)/);
    return m ? parseInt(m[1]!, 10) : undefined;
  }

  protected extractBadges($: CheerioAPI): string[] {
    const map: Record<string, string> = {
      'badge-video': 'video',
      'badge-review': 'review',
      'badge-new': 'new',
      'badge-pornstar': 'pornstar',
      'badge-duo': 'duo',
      'badge-independent': 'independent',
    };
    return Object.entries(map)
      .filter(([cls]) => $(`.${cls}`).length > 0)
      .map(([, name]) => name);
  }

  private extractMapCoordinates($: CheerioAPI): { lat: number; lng: number } | undefined {
    try {
      const raw = $(DatingBaseAdapter.baseSelectors.incallMap.selector).attr('data-data');
      if (!raw) return undefined;
      const geo = JSON.parse(raw) as {
        features?: Array<{ geometry?: { coordinates?: number[] } }>;
      };
      const coords = geo.features?.[0]?.geometry?.coordinates;
      if (!coords || coords.length < 2) return undefined;
      return { lat: coords[1]!, lng: coords[0]! };
    } catch {
      return undefined;
    }
  }

  protected override shouldUseFallbackImages(): boolean {
    return false;
  }

  protected abstract extractRates($: CheerioAPI): EscortRate[];
  protected abstract extractServices($: CheerioAPI): EscortService[];
  protected extractReviews(_$: CheerioAPI): EscortReview[] {
    return [];
  }
}
