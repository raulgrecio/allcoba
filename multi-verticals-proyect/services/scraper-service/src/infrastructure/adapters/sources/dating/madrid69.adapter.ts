import type { CheerioAPI } from 'cheerio';

import type { CountryCode, CurrencyCode } from '@allcoba/legacy-domain';



import type { SelectorDef } from '../base-source.adapter.js';
import type { DatingAttributes, EscortRate, EscortService } from './dating-attributes.js';
import { DatingBaseAdapter } from './dating.base.js';

// ── API types ─────────────────────────────────────────────────────────────────
// Inferidos del backend Laravel en api.madrid69.com.
// Campos en snake_case español — convención habitual en proyectos Laravel ES.

interface Madrid69Image {
  id?: number;
  ruta?: string; // path relativo: "images/{id}/foto1.jpg"
  thumbnail?: string; // path thumbnail
}

interface Madrid69Rate {
  duracion?: number; // minutos: 30, 60, 120
  precio?: number; // EUR
  modalidad?: 'incall' | 'outcall' | 'ambos';
}

interface Madrid69ServiceItem {
  id?: number;
  nombre?: string;
  slug?: string;
}

interface Madrid69Profile {
  id?: number;
  nombre?: string;
  slug?: string;
  edad?: number;
  descripcion?: string;
  ciudad?: string;
  zona?: string;
  telefono?: string; // 9 dígitos; puede estar enmascarado
  whatsapp?: string;
  verificado?: boolean;
  vip?: boolean;
  nacionalidad?: string;
  altura?: number; // cm
  peso?: number; // kg
  medidas?: string; // "90-60-90"
  idiomas?: string[];
  fotos?: Madrid69Image[];
  tarifas?: Madrid69Rate[];
  servicios?: Madrid69ServiceItem[];
  caracteristicas?: Record<string, boolean | string>;
  estado?: string;
}

// La API puede devolver `{ data: Madrid69Profile }` o el perfil en la raíz.
interface Madrid69ApiResponse {
  data?: Madrid69Profile;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @name Madrid69
 * @domain madrid69.com
 * @technology Next.js (CSR) + Laravel backend (api.madrid69.com)
 * @protection None
 * @ui_interactors None // Pendiente: añadir verification edad.
 * @auth None
 * @url_listing /citas/{city}
 * @url_detail /citas/{city}/{slug}
 * @extraction_method Playwright + API interception (captureNetwork)
 */
export class Madrid69Adapter extends DatingBaseAdapter {
  readonly identifier = 'madrid69';
  readonly defaultVertical = 'dating' as const;
  readonly defaultCountry: CountryCode = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  private _profile: Madrid69Profile | null = null;

  protected override readonly selectors = {
    title: {
      selector: 'h1',
      expectedType: 'text',
      required: true,
    },
    gallery: {
      selector: 'img[src*="api.madrid69.com/storage/images"]',
      expectedType: 'image-list',
      required: false,
    },
    nextPage: {
      selector: 'a[rel="next"]',
      expectedType: 'exists',
      required: false,
    },
  } as const satisfies Record<string, SelectorDef>;

  override async extract(url: string, options?: Parameters<DatingBaseAdapter['extract']>[1]) {
    return super.extract(url, { ...options, captureNetwork: true });
  }

  protected override async onNetworkCaptured(
    responses: Array<{ url: string; status: number; body: string; contentType: string }>,
  ): Promise<void> {
    const apiResponses = responses.filter(
      (r) => r.status === 200 && /api\.madrid69\.com/.test(r.url),
    );

    for (const res of apiResponses) {
      try {
        const parsed = JSON.parse(res.body) as Madrid69ApiResponse | Madrid69Profile;
        const candidate =
          'data' in parsed && parsed.data ? parsed.data : (parsed as Madrid69Profile);
        if (candidate.nombre || candidate.id) {
          this._profile = candidate;
          return;
        }
      } catch {}
    }
  }

  canHandle(url: string): boolean {
    return /madrid69\.com/.test(url);
  }

  isProfileUrl(url: string): boolean {
    // Listing: /citas/{city} (sin slug)  Profile: /citas/{city}/{slug}
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts[0] === 'citas' && parts.length >= 3;
  }

  protected override extractNickname($: CheerioAPI, _url: string): string | undefined {
    if (this._profile?.nombre) return this._profile.nombre;
    return $(this.selectors.title.selector).first().text().trim();
  }

  protected override extractId(url: string, _$: CheerioAPI): string {
    if (this._profile?.id) return String(this._profile.id);
    const slug = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
    return slug.match(/-(\d+)/)?.[1] ?? slug;
  }

  protected extractTitle($: CheerioAPI): string {
    if (this._profile?.nombre) return this._profile.nombre;
    return (
      $(this.selectors.title.selector).first().text().trim() ||
      $(DatingBaseAdapter.baseSelectors.titleTag.selector).text().trim()
    );
  }

  protected extractDescription(_$: CheerioAPI): string {
    return this._profile?.descripcion ?? '';
  }

  protected override extractPrice(_$: CheerioAPI): number | undefined {
    return this._profile?.tarifas?.[0]?.precio;
  }

  protected override extractCity(_$: CheerioAPI): string | undefined {
    return this._profile?.ciudad;
  }

  protected override extractZone(_$: CheerioAPI): string | undefined {
    return this._profile?.zona;
  }

  protected override async extractPhones(_$: CheerioAPI): Promise<string[]> {
    const phones = new Set<string>();
    if (this._profile?.telefono) phones.add(this._profile.telefono);
    if (this._profile?.whatsapp) phones.add(this._profile.whatsapp);
    return Array.from(phones);
  }

  protected override extractImagesFromDom(
    $: CheerioAPI,
    customSelectors: string[] = [],
    baseUrl?: string,
  ): string[] {
    const urls = new Set<string>(super.extractImagesFromDom($, customSelectors, baseUrl));

    // Add images from intercepted API profile
    this._profile?.fotos?.forEach((img) => {
      if (img.ruta) {
        urls.add(`https://api.madrid69.com/storage/${img.ruta}`);
      }
    });

    return Array.from(urls);
  }

  protected extractRates(_$: CheerioAPI): EscortRate[] {
    return (
      this._profile?.tarifas
        ?.filter((t) => t.duracion)
        .map((t) => ({
          duration: `${t.duracion}min`,
          incall: t.modalidad === 'incall' || t.modalidad === 'ambos' ? t.precio : undefined,
          outcall: t.modalidad === 'outcall' || t.modalidad === 'ambos' ? t.precio : undefined,
        })) ?? []
    );
  }

  protected extractServices(_$: CheerioAPI): EscortService[] {
    return (
      this._profile?.servicios
        ?.filter((s) => s.nombre)
        .map((s) => ({ name: s.nombre!, included: true, extra: false })) ?? []
    );
  }

  protected override extractAttributes($: CheerioAPI, url: string): DatingAttributes {
    const base = super.extractAttributes($, url);
    const p = this._profile;
    return {
      ...base,
      age: p?.edad ?? base.age,
      nationality: p?.nacionalidad ?? base.nationality,
      heightCm: p?.altura ?? base.heightCm,
      weightKg: p?.peso ?? base.weightKg,
      measurements: p?.medidas ?? base.measurements,
      languages: p?.idiomas ?? base.languages,
      independent: true,
      verified: p?.verificado ?? false,
      badges: p?.vip ? ['vip'] : base.badges,
      rates: this.extractRates($),
      services: this.extractServices($),
    };
  }

  extractNextPageUrl(_html: string, _baseUrl: string): string | undefined {
    // CSR: paginación via API — pendiente interceptar endpoint de listing
    return undefined;
  }
}
