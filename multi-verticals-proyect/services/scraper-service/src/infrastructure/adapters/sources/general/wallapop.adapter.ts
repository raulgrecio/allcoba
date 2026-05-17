import type { CheerioAPI } from 'cheerio';

import type { Coordinates, CountryCode, CurrencyCode } from '@allcoba/legacy-domain';

import { Vertical } from '#domain/entities/vertical.js';

import type { SelectorDef } from '../base-source.adapter.js';
import { BaseSourceAdapter } from '../base-source.adapter.js';

interface WallapopItem {
  title?: { original?: string };
  description?: { original?: string };
  price?: { cash?: { amount?: number } };
  location?: {
    city?: string;
    postalCode?: string;
    countryCode?: string;
    latitude?: number;
    longitude?: number;
  };
  images?: Array<{ urls?: { small?: string; medium?: string; big?: string } }>;
  characteristics?: string;
  taxonomies?: Array<{ name?: string }>;
  flags?: Record<string, boolean>;
}

export class WallapopAdapter extends BaseSourceAdapter {
  readonly identifier = 'wallapop';
  readonly defaultVertical = Vertical.GENERAL;
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  protected override readonly selectors: Record<string, SelectorDef> = {
    data: { selector: '#__NEXT_DATA__', expectedType: 'exists', required: true },
    title: { selector: 'h1', expectedType: 'text', required: true },
    gallery: { selector: 'img[slot="carousel-content"]', expectedType: 'exists', required: false },
    price: { selector: '[class*="item-detail-price"]', expectedType: 'text', required: false },
  };

  canHandle(url: string): boolean {
    return url.includes('wallapop.com');
  }

  protected extractId(url: string): string {
    return url.split('-').pop() || url;
  }

  private parseNextData($: CheerioAPI): WallapopItem | null {
    try {
      const raw = $(this.selectors['data']!.selector).html();
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { props?: { pageProps?: { item?: WallapopItem } } };
      return parsed?.props?.pageProps?.item ?? null;
    } catch {
      return null;
    }
  }

  protected extractTitle($: CheerioAPI): string {
    const item = this.parseNextData($);
    if (item?.title?.original) return item.title.original;
    return $(this.selectors['title']!.selector).first().text().trim();
  }

  protected extractDescription($: CheerioAPI): string {
    return this.parseNextData($)?.description?.original ?? '';
  }

  protected extractPrice($: CheerioAPI): number | undefined {
    return this.parseNextData($)?.price?.cash?.amount ?? undefined;
  }

  protected override extractCity($: CheerioAPI): string | undefined {
    return this.parseNextData($)?.location?.city ?? undefined;
  }

  protected override extractPostalCode($: CheerioAPI): string | undefined {
    return this.parseNextData($)?.location?.postalCode ?? undefined;
  }

  protected override extractCoordinates($: CheerioAPI): Coordinates | undefined {
    const loc = this.parseNextData($)?.location;
    if (!loc?.latitude || !loc?.longitude) return undefined;
    return { lat: loc.latitude, lng: loc.longitude };
  }

  protected override extractCountry($: CheerioAPI): string | undefined {
    return this.parseNextData($)?.location?.countryCode ?? undefined;
  }

  protected override shouldUseFallbackImages(): boolean {
    return false;
  }

  protected override extractAdditionalImageUrls($: CheerioAPI): string[] {
    const images = this.parseNextData($)?.images ?? [];
    return images.map((img) => img?.urls?.big).filter((url): url is string => !!url);
  }

  protected override getCookieSelectors(): string[] {
    return ['.cmpboxbtnyes'];
  }

  protected detectVertical(url: string): Vertical {
    if (url.includes('c11545-coches')) return Vertical.MOTOR;
    if (url.includes('c11098-inmobiliaria')) return Vertical.REAL_ESTATE;
    if (url.includes('c12485-servicios')) return Vertical.SERVICES;
    return Vertical.GENERAL;
  }

  protected extractAttributes($: CheerioAPI): any {
    const item = this.parseNextData($);
    return {
      condition: item?.characteristics ?? undefined,
      category: item?.taxonomies?.map((t) => t.name).filter(Boolean),
      flags: item?.flags,
      verticalDetected: this.detectVertical(''),
    };
  }
}
