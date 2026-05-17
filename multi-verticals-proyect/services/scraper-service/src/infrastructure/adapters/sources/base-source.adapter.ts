import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { Coordinates, CountryCode, CurrencyCode } from '@allcoba/legacy-domain';
import { Phone } from '@allcoba/legacy-domain';
import { logger } from '@allcoba/kernel';

import type {
  CrawlerOptions,
  CrawlerPort,
  SecurityStrategy,
} from '#application/ports/crawler.port.js';
import type {
  LocationInfo,
  RawContact,
  RawExtraction,
  SourcePort,
} from '#application/ports/source.port.js';
import { CrawlerEngine, ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.js';
import { Vertical } from '#domain/entities/vertical.js';

import { RobotsChecker } from '../../crawler/robots-checker.js';

export type SelectorDef = {
  selector: string;
  expectedType: 'text' | 'image-list' | 'exists';
  required: boolean;
};

export type SelectorCheck = SelectorDef & { name: string };

export interface HealthReport {
  ok: boolean;
  checks: Array<{ name: string; ok: boolean; reason?: string }>;
}

export abstract class BaseSourceAdapter implements SourcePort {
  abstract readonly identifier: string;
  abstract readonly defaultVertical: Vertical;
  abstract readonly defaultCountry: CountryCode;
  abstract readonly defaultCurrency: CurrencyCode;
  protected robotsChecker = new RobotsChecker();
  protected readonly browser: CrawlerPort;
  protected readonly logger = logger().child({ component: this.constructor.name });

  constructor(crawler: CrawlerPort) {
    this.browser = crawler;
  }

  abstract canHandle(url: string): boolean;

  /**
   * EL TEMPLATE METHOD: Define el algoritmo de extracción y recoge metadatos técnicos.
   */
  async extract(
    url: string,
    options?: CrawlerOptions & {
      html?: string;
    },
  ): Promise<{
    data: RawExtraction;
    html: string;
    networkResponses?: Array<{ url: string; status: number; body: string; contentType: string }>;
  }> {
    const startTime = Date.now();

    // 1. Crawling técnico o uso de HTML directo
    let result: {
      html: string;
      userAgent: string;
      status: number;
      serverIp?: string;
      outboundIp?: string;
      networkResponses?: Array<{ url: string; status: number; body: string; contentType: string }>;
    };

    if (options?.html) {
      result = {
        html: options.html,
        userAgent: 'fixture-bot',
        status: 200,
      };
    } else {
      const crawlerOptions = this.getCrawlerOptions(url, options);
      result = await this.browser.fetch(url, {
        ...crawlerOptions,
        ...options, // Las opciones pasadas a extract sobreescriben las por defecto
        trafficBlacklist: [
          ...(crawlerOptions.trafficBlacklist ?? []),
          ...this.getTrafficBlacklist(),
        ],
      });
    }

    const durationMs = Date.now() - startTime;

    if (result.networkResponses?.length) {
      await this.onNetworkCaptured(result.networkResponses);
    }

    const $ = cheerio.load(result.html);

    // 2. Extracción de dominio (delegada)
    const data = await this.performExtraction($, url);

    // 3. Enriquecimiento con metadatos técnicos globales
    return {
      data: {
        ...data,
        metadata: {
          timestamp: new Date().toISOString(),
          durationMs,
          sourceUrl: url,
          userAgent: result.userAgent,
          serverIp: result.serverIp,
          outboundIp: result.outboundIp,
          statusCode: result.status,
          // El campo debugFile lo rellenará el caso de uso si guarda el archivo
        },
      },
      html: result.html,
      networkResponses: result.networkResponses,
    };
  }

  protected readonly selectors: Record<string, SelectorDef> = {};

  protected async onNetworkCaptured(
    _responses: Array<{ url: string; status: number; body: string; contentType: string }>,
  ): Promise<void> {}

  protected getSelectorChecks(): SelectorCheck[] {
    return Object.entries(this.selectors).map(([name, def]) => ({ name, ...def }));
  }

  checkHealth($: CheerioAPI): HealthReport {
    const checks = this.getSelectorChecks();
    if (checks.length === 0) return { ok: true, checks: [] };

    const results = checks.map((check) => {
      const selector = check.selector;
      const elements = $(selector);
      let ok: boolean;
      let reason: string | undefined;

      if (check.expectedType === 'exists' || check.expectedType === 'image-list') {
        ok = elements.length > 0;
        if (!ok) reason = `"${selector}" → 0 elements`;
      } else {
        const text = elements.first().text().trim();
        ok = text.length > 0;
        if (!ok) reason = `"${selector}" → empty text`;
      }

      return { name: check.name, ok, reason };
    });

    const overallOk = checks.every((check, i) => !check.required || results[i]!.ok);
    const report: HealthReport = { ok: overallOk, checks: results };
    const failed = results.filter((r, i) => !r.ok && checks[i]!.required);
    if (failed.length > 0) {
      this.logger.warn(
        { source: this.identifier, failed },
        'Required selector health check failures — site may have changed',
      );
    }

    return report;
  }

  /**
   * Lógica interna de extracción que utiliza Cheerio.
   */
  protected async performExtraction(
    $: CheerioAPI,
    url: string,
  ): Promise<Omit<RawExtraction, 'metadata'>> {
    this.checkHealth($);
    const domImages = this.extractImagesFromDom($, this.getImageSelectors($), url);
    const extraImages = this.extractAdditionalImageUrls($);
    const imageUrls = [...new Set([...domImages, ...extraImages])];

    const location = this.extractLocation($, url);

    const rawPhones = await this.extractPhones($, url);
    const phones = rawPhones
      .map((raw) => {
        const r = Phone.create(raw, this.defaultCountry);
        return r.success ? r.value.e164 : null;
      })
      .filter((p): p is string => p !== null);

    const attributes = this.extractAttributes($, url);

    return {
      source: this.identifier,
      externalId: this.extractId(url, $),
      url,
      name: this.extractTitle($),
      description: this.extractDescription($),
      location,
      price: this.extractPrice($),
      phones,
      contacts: this.extractContacts($, attributes),
      imageUrls,
      vertical: this.detectVertical(url),
      currency: this.defaultCurrency,
      attributes,
      extractedAt: new Date(),
    };
  }

  protected extractContacts(_$: CheerioAPI, _attributes: Record<string, unknown>): RawContact[] {
    return [];
  }

  protected extractLocation($: CheerioAPI, url: string): LocationInfo {
    return {
      country: this.extractCountry($, url) ?? this.defaultCountry,
      address: this.extractAddress($, url),
      city: this.extractCity($, url),
      zone: this.extractZone($, url),
      region: this.extractRegion($, url),
      postalCode: this.extractPostalCode($, url),
      coordinates: this.extractCoordinates($, url),
    };
  }

  protected extractAddress(_$: CheerioAPI, _url: string): string | undefined {
    return undefined;
  }
  protected extractCity(_$: CheerioAPI, _url: string): string | undefined {
    return undefined;
  }
  protected extractZone(_$: CheerioAPI, _url: string): string | undefined {
    return undefined;
  }
  protected extractRegion(_$: CheerioAPI, _url: string): string | undefined {
    return undefined;
  }
  protected extractPostalCode(_$: CheerioAPI, _url: string): string | undefined {
    return undefined;
  }
  protected extractCoordinates(_$: CheerioAPI, _url: string): Coordinates | undefined {
    return undefined;
  }
  protected extractCountry(_$: CheerioAPI, _url: string): string | undefined {
    return undefined;
  }

  protected extractAdditionalImageUrls(_$: CheerioAPI): string[] {
    return [];
  }

  /**
   * Configuración específica para el Crawler de este portal
   */
  public async fetchHtml(
    url: string,
    options?: {
      waitUntil?: CrawlerOptions['waitUntil'];
      skipInteractions?: boolean;
      headless?: boolean;
    },
  ): Promise<{ html: string }> {
    const crawlerOptions = this.getCrawlerOptions(url, options);
    const result = await this.browser.fetch(url, {
      ...crawlerOptions,
      waitUntil: options?.waitUntil,
      headless: options?.headless,
    });
    return { html: result.html };
  }

  getCrawlerOptions(_url: string, options?: { skipInteractions?: boolean }): CrawlerOptions {
    const strategy = this.getSecurityStrategy();
    return {
      ...strategy,
      ageGateSelectors: this.getAgeGateSelectors(),
      cookieSelectors: this.getCookieSelectors(),
      onBeforeCapture: (page: any) => this.onBeforeCapture(page, options),
    };
  }

  /**
   * Define la agresividad necesaria para saltar protecciones.
   * Por defecto: Sin proxy, sin solver automático.
   */
  protected getSecurityStrategy(): SecurityStrategy {
    return {
      proxyStrategy: ProxyStrategy.NONE,
      solverStrategy: SolverStrategy.NONE,
      engine: CrawlerEngine.PATCHRIGHT,
    };
  }

  /**
   * Dominios específicos de este portal a ignorar en la captura de red
   */
  protected getTrafficBlacklist(): string[] {
    return [];
  }

  protected getAgeGateSelectors(): string[] {
    const sel = (this.selectors as Record<string, SelectorDef>).ageGate?.selector;
    return sel ? [sel] : [];
  }

  protected getCookieSelectors(): string[] {
    const sel = (this.selectors as Record<string, SelectorDef>).cookies?.selector;
    return sel ? [sel] : [];
  }

  protected async onBeforeCapture(
    _page: any,
    _options?: { skipInteractions?: boolean },
  ): Promise<void> {
    // Por defecto no hace nada, los hijos lo sobreescriben
  }

  protected abstract extractId(url: string, $: CheerioAPI): string;
  protected abstract extractTitle($: CheerioAPI): string;
  protected abstract extractDescription($: CheerioAPI): string;
  protected abstract extractPrice($: CheerioAPI): number | undefined;
  protected abstract extractAttributes($: CheerioAPI, url: string): any;

  protected shouldUseFallbackImages(): boolean {
    return true;
  }

  protected getImageSelectors(_$: CheerioAPI): string[] {
    return Object.values(this.selectors)
      .filter((s) => s.expectedType === 'image-list')
      .map((s) => s.selector);
  }

  /**
   * Hook para transformar URLs de imágenes (ej. cambiar miniaturas por originales).
   */
  protected transformImageUrl(url: string): string {
    return url;
  }

  // Opcional: El teléfono puede requerir lógica compleja (clics)
  protected async extractPhones(_$: CheerioAPI, _url: string): Promise<string[]> {
    return [];
  }

  protected detectVertical(_url: string): Vertical {
    return this.defaultVertical;
  }

  async isAllowed(url: string): Promise<boolean> {
    return this.robotsChecker.isAllowed(url);
  }

  isProfileUrl(_url: string): boolean {
    return true; // Por defecto todo lo que pasa canHandle() es perfil. Sobreescribir en hijos.
  }

  extractProfileLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const links = new Set<string>();

    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        try {
          const absoluteUrl = new URL(href, baseUrl).toString();
          if (this.canHandle(absoluteUrl) && this.isProfileUrl(absoluteUrl)) {
            links.add(absoluteUrl);
          }
        } catch {
          // Ignorar URLs inválidas
        }
      }
    });

    return Array.from(links);
  }

  extractNextPageUrl(_html: string, _baseUrl: string): string | undefined {
    return undefined; // A implementar por el hijo si se quiere paginación
  }

  private static readonly FORMAT_PRIORITY: Record<string, number> = {
    jpg: 0,
    jpeg: 0,
    png: 0,
    webp: 1,
    avif: 2,
    gif: 3,
  };

  private imageFormatPriority(url: string): number {
    const ext = url.split('?')[0]?.split('.').pop()?.toLowerCase() ?? '';
    return BaseSourceAdapter.FORMAT_PRIORITY[ext] ?? 4;
  }

  private pickBestSrcset(
    srcset: string,
    currentBest: string,
    currentMaxW: number,
  ): { src: string; maxW: number } {
    let bestSrc = currentBest;
    let maxW = currentMaxW;

    const parts = srcset.split(',').map((p) => p.trim());
    for (const part of parts) {
      const [itemUrl, widthStr] = part.split(/\s+/);
      if (!itemUrl) continue;
      const width = parseInt(widthStr ?? '0', 10);
      const newPriority = this.imageFormatPriority(itemUrl);
      const currentPriority = bestSrc ? this.imageFormatPriority(bestSrc) : 99;

      if (width > maxW || (width === maxW && newPriority < currentPriority)) {
        maxW = width;
        bestSrc = itemUrl;
      }
    }

    return { src: bestSrc, maxW };
  }

  /**
   * Extracción de imágenes con prioridad a los selectores específicos
   */
  protected extractImagesFromDom(
    $: CheerioAPI,
    customSelectors: string[] = [],
    baseUrl?: string,
  ): string[] {
    const imageUrls: string[] = [];

    const runSelectors = (selectors: string[]) => {
      const elements = $(selectors.join(','));
      elements.each((_, el) => {
        const $el = $(el);

        if ($el.is('picture')) {
          const sources = $el.find('source');
          let bestSrc = '';
          let maxW = 0;

          sources.each((_, source) => {
            const srcset = $(source).attr('srcset');
            if (srcset) {
              const result = this.pickBestSrcset(srcset, bestSrc, maxW);
              bestSrc = result.src;
              maxW = result.maxW;
            }
          });

          if (!bestSrc) {
            const innerImg = $el.find('img').first();
            bestSrc = innerImg.attr('src') || innerImg.attr('data-src') || '';
          }

          if (bestSrc) this.addImageUrl(bestSrc, imageUrls, baseUrl);
          return;
        }

        if ($el.is('img') && $el.parent().is('picture')) {
          // picture already handled above if <picture> was in selectors;
          // if only <img> was selected (fallback), read src directly — dedup check prevents duplicates
          const src = $el.attr('src') || $el.attr('data-src') || '';
          if (src) this.addImageUrl(src, imageUrls, baseUrl);
          return;
        }

        const srcset = $el.attr('srcset');
        if (srcset) {
          const result = this.pickBestSrcset(srcset, '', 0);
          if (result.src) {
            this.addImageUrl(result.src, imageUrls, baseUrl);
            return;
          }
        }

        let src =
          $el.attr('src') ||
          $el.attr('href') ||
          $el.attr('data-retina') ||
          $el.attr('data-src') ||
          $el.attr('data-lazy') ||
          $el.attr('data-original') ||
          $el.attr('data-thumbnail') ||
          $el.attr('poster');

        if (!src) {
          const style = $el.attr('style');
          if (style && style.includes('url(')) {
            const m = style.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (m && m[1]) src = m[1];
          }
        }

        if (src) this.addImageUrl(src, imageUrls, baseUrl);
      });
    };

    if (customSelectors.length > 0) runSelectors(customSelectors);
    if (imageUrls.length === 0 && this.shouldUseFallbackImages()) {
      runSelectors([
        'img[src*="static"]',
        'img[src*="images"]',
        '[class*="Multimedia"] img',
        '[class*="Photos"] img',
      ]);
    }

    return imageUrls.sort((a, b) => this.imageFormatPriority(a) - this.imageFormatPriority(b));
  }

  /**
   * Utilidad global para extraer números mediante Regex de un bloque de texto.
   */
  protected parseFromText(text: string, patterns: RegExp[]): number | undefined {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) return parseInt(match[1], 10);
    }

    return undefined;
  }

  private static readonly AD_NETWORKS =
    /doubleclick|googlesyndication|adsystem|googleads|adserver|advertising|bannersnack|outbrain|taboola|moatads|amazon-adsystem/i;
  private static readonly SKIP_PATTERNS = /logo|icon|avatar|pixel|spinner|placeholder|blank/i;
  private static readonly THUMBNAIL_PATTERNS =
    /[/_-](thumb|thumbnail|small|xs|xxs|mini|sq|square)[/_.-]/i;

  private addImageUrl(src: string, imageUrls: string[], baseUrl?: string): void {
    let resolved = src.trim();
    if (resolved.startsWith('//')) {
      resolved = `https:${resolved}`;
    } else if (resolved.startsWith('/') && baseUrl) {
      try {
        resolved = new URL(resolved, baseUrl).toString();
      } catch {
        /* ignore */
      }
    }

    if (!resolved || !resolved.startsWith('http')) return;

    // Aplicar transformaciones específicas del adaptador
    const transformed = this.transformImageUrl(resolved);
    if (!transformed || imageUrls.includes(transformed)) return;

    if (BaseSourceAdapter.AD_NETWORKS.test(transformed)) return;
    if (BaseSourceAdapter.SKIP_PATTERNS.test(transformed)) return;
    if (BaseSourceAdapter.THUMBNAIL_PATTERNS.test(transformed)) return;
    if (
      /\.(jpg|jpeg|png|webp|avif|gif)/i.test(transformed) ||
      transformed.includes('media') ||
      /\/images?\//i.test(transformed)
    ) {
      imageUrls.push(transformed);
    }
  }

  /**
   * Extrae todos los nodos de texto de forma recursiva para evitar concatenaciones.
   */
  private extractDeepText(el: any, $: CheerioAPI): string[] {
    const textNodes: string[] = [];

    const collect = (node: any) => {
      // Usamos 'type' para identificar nodos de texto de forma segura
      if ('data' in node && node.type === 'text') {
        const t = node.data.trim();
        if (t) textNodes.push(t);
      } else if ('children' in node && node.children) {
        node.children.forEach((child: any) => collect(child));
      }
    };
    collect(el);
    return textNodes;
  }

  /**
   * Recolecta pares de Clave: Valor de una lista de elementos (li, div, etc).
   */
  protected collectRawFeatures($: CheerioAPI, selector: string): Record<string, string> {
    const rawFeatures: Record<string, string> = {};
    $(selector).each((_, el: any) => {
      const textNodes = this.extractDeepText(el, $);

      if (textNodes.length >= 2 && textNodes[0]) {
        const label = textNodes[0].replace(/:$/, '').trim();
        const value = textNodes.slice(1).join(' ').trim();
        rawFeatures[label] = value;
      } else if (textNodes.length === 1 && textNodes[0]) {
        rawFeatures[textNodes[0]] = 'Sí';
      }
    });

    // Limpieza de claves que contienen ":" (como Energía: G)
    Object.keys(rawFeatures).forEach((key) => {
      if (key.includes(':') && rawFeatures[key] === 'Sí') {
        const [newKey, ...rest] = key.split(':');
        rawFeatures[newKey!.trim()] = rest.join(':').trim();
        delete rawFeatures[key];
      }
    });
    return rawFeatures;
  }
}
