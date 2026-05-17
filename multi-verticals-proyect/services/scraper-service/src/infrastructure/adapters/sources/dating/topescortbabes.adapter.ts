import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/legacy-domain';

import type { SecurityStrategy } from '#application/ports/crawler.port.js';
import { CrawlerEngine, ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.js';

import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

/**
 * @name TopEscortBabes
 * @domain topescortbabes.com
 * @technology Laravel / Custom (window.profileData JSON)
 * @protection Cloudflare WAF
 * @ui_interactors Cookies // PENDIENTE: NO VI EL POPUP NI DE EDAD NI DE COOKIES
 * @auth None
 * @url_listing /es/spain/escorts
 * @url_detail /es/spain/escorts/{slug}
 * @extraction_method Hybrid (JSON in HTML script tag + DOM fallback)
 */
export class TopEscortBabesAdapter extends DatingBaseAdapter {
  readonly identifier = 'topescortbabes';
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override getSecurityStrategy(): SecurityStrategy {
    return {
      engine: CrawlerEngine.PATCHRIGHT,
      proxyStrategy: ProxyStrategy.PROXY,
      solverStrategy: SolverStrategy.NONE,
      sessionProfile: 'topescortbabes',
    };
  }

  /*
  protected override getCrawlerOptions(url: string, options?: { skipInteractions?: boolean }) {
    const base = super.getCrawlerOptions(url, options);
    // Profile pages get a fresh context per request (no session profile).
    // Listing pages reuse the session profile for speed.
    // Fresh context + Zyte proxy bypasses Cloudflare on profile pages
    // without headless fingerprint contamination from the listing session.
    if (this.isProfileUrl(url)) {
      const { sessionProfile: _, ...withoutProfile } = base;
      return withoutProfile;
    }
    return base;
  }
  */

  protected override async onBeforeCapture(page: any): Promise<void> {
    // Settle delay: wait 3-5s for Cloudflare and dynamic content
    const wait = Math.floor(Math.random() * 2000) + 3000;
    await new Promise((res) => setTimeout(res, wait));
  }

  protected override readonly selectors = {
    title: {
      selector: 'h1',
      expectedType: 'text',
      required: true,
    },
    description: {
      selector: '.profile-description, .profile-bio, .about, .description',
      expectedType: 'text',
      required: false,
    },
    scriptData: {
      selector: 'script:contains("window.profileData")',
      expectedType: 'exists',
      required: false,
    },
    nextPage: {
      selector: 'a[rel="next"]',
      expectedType: 'exists',
      required: false,
    },
    cookies: {
      selector: '#onetrust-accept-btn-handler, .cc-accept, button[class*="accept"]',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  canHandle(url: string): boolean {
    return url.includes('topescortbabes.com');
  }

  isProfileUrl(url: string): boolean {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const escortsIdx = parts.indexOf('escorts');
    if (escortsIdx === -1) return false;
    const slug = parts[escortsIdx + 1];
    // Profile slugs end with _{numericId} (e.g. "Scarlett-Rous_2817245").
    // Filter pages like "latina-ethnic", "black-hair" do not.
    return !!slug && /_\d+$/.test(slug);
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    const profileData = this.getProfileData($);
    return profileData?.nickname;
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    return new URL(url).pathname.split('/').filter(Boolean).pop() ?? url;
  }

  protected extractTitle($: CheerioAPI): string {
    return $(this.selectors.title.selector).first().text().trim();
  }

  protected extractDescription($: CheerioAPI): string {
    const profileData = this.getProfileData($);
    if (profileData?.aboutMe?.content) return profileData.aboutMe.content;
    return $(this.selectors.description.selector).first().text().trim();
  }

  protected extractPrice($: CheerioAPI): number | undefined {
    const profileData = this.getProfileData($);
    if (profileData?.minimumPrice) return Number(profileData.minimumPrice);
    return undefined;
  }

  protected extractRates($: CheerioAPI): EscortRate[] {
    const profileData = this.getProfileData($);
    if (profileData?.prices && Array.isArray(profileData.prices)) {
      return profileData.prices.map((p: any) => ({
        duration: p.label || p.duration || '',
        incall: p.price_incall ? Number(p.price_incall) : undefined,
        outcall: p.price_outcall ? Number(p.price_outcall) : undefined,
      }));
    }
    return [];
  }

  protected extractServices($: CheerioAPI): EscortService[] {
    return [];
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);
    const profileData = this.getProfileData($);
    if (profileData) {
      const details = profileData.personalDetails || {};
      const attributes: DatingAttributes = {
        ...base,
        nickname: profileData.nickname ?? base.nickname,
        age: profileData.age ? Number(profileData.age) : base.age,
        gender:
          profileData.gender === 'female'
            ? 'Mujer'
            : profileData.gender === 'male'
              ? 'Hombre'
              : base.gender,
        heightCm: this.parseFirstInt(this.stripHtml(details.height)) ?? base.heightCm,
        weightKg: this.parseFirstInt(this.stripHtml(details.weight)) ?? base.weightKg,
        hairColor: this.stripHtml(details.hair) ?? base.hairColor,
        eyeColor: this.stripHtml(details.eyes) ?? base.eyeColor,
        ethnicity: this.stripHtml(details.ethnic) ?? base.ethnicity,
        nationality: this.stripHtml(details.nationality) ?? base.nationality,
        orientation: this.stripHtml(details.orientation) ?? base.orientation,
        languages: profileData.spokenLanguage ? [profileData.spokenLanguage] : base.languages,
        verified: profileData.badges?.verified || base.verified,
        independent: profileData.agencyId === 0,
        badges: [...new Set([...(base.badges ?? []), ...this.extractBadgesFromData(profileData)])],
        rates: this.extractRates($),
        services: this.extractServices($),
      };

      if (details.bust && details.waist && details.hip) {
        attributes.measurements = `${details.bust}-${details.waist}-${details.hip}`;
      }

      return attributes;
    }

    return {
      ...base,
      independent: true,
      verified: base.verified,
      badges: base.badges ?? [],
      rates: [],
      services: [],
      reviews: [],
    };
  }

  protected override extractImagesFromDom(
    $: CheerioAPI,
    customSelectors: string[] = [],
    baseUrl?: string,
  ): string[] {
    const urls = new Set<string>(super.extractImagesFromDom($, customSelectors, baseUrl));

    const profileData = this.getProfileData($);
    if (profileData?.photos && Array.isArray(profileData.photos)) {
      profileData.photos.forEach((p: any) => {
        if (p.path && /\.(jpg|jpeg|png|webp|avif|gif)/i.test(p.path)) {
          urls.add(p.path);
        }
      });
    }

    return Array.from(urls);
  }

  protected override async extractPhones($: CheerioAPI, _url: string): Promise<string[]> {
    const profileData = this.getProfileData($);
    if (profileData?.phoneNumber) return [profileData.phoneNumber];
    if (profileData?.encodedPhoneNumber) {
      const decoded = this.decodeContactInfo(profileData.encodedPhoneNumber);
      if (decoded) return [decoded];
    }
    return [];
  }

  protected override extractContacts($: CheerioAPI, _attributes: Record<string, unknown>): any[] {
    const contacts: any[] = [];
    const profileData = this.getProfileData($);
    if (profileData?.encodedTelegram) {
      const telegram = this.decodeContactInfo(profileData.encodedTelegram);
      if (telegram) contacts.push({ platform: 'TELEGRAM', handle: telegram });
    }
    return contacts;
  }

  private getProfileData($: CheerioAPI): any {
    const script = $(this.selectors.scriptData.selector).html();
    if (!script) return null;
    try {
      // Usamos una regex menos avara y evitamos la dependencia de JSON estricto
      const match = script.match(
        /window\.profileData\s*=\s*(\{[\s\S]*?\});(?:\s*(?:window|var _req|<)|$)/,
      );
      if (match && match[1]) {
        return new Function('return ' + match[1])();
      }
    } catch (e) {
      this.logger.warn('Failed to parse window.profileData');
    }
    return null;
  }

  private extractBadgesFromData(profileData: any): string[] {
    const badges: string[] = [];
    if (profileData.badges?.verified) badges.push('verified');
    if (profileData.badges?.vip) badges.push('vip');
    if (profileData.badges?.pornstar) badges.push('pornstar');
    if (profileData.isNew) badges.push('new');
    return badges;
  }

  private stripHtml(html: string | undefined): string | undefined {
    if (!html) return undefined;
    return html.replace(/<[^>]*>?/gm, '').trim();
  }

  private decodeContactInfo(encoded: string): string | undefined {
    // TODO: Reverse engineer progressive shift cipher observed in encodedPhoneNumber/encodedTelegram
    return undefined;
  }

  extractNextPageUrl(html: string, baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    return $(this.selectors.nextPage.selector).attr('href') ?? undefined;
  }
}
