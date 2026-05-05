import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import { logger } from '@allcoba/kernel';

import type { RawExtraction, SourcePort } from '#application/ports/source.port.js';
import { Vertical } from '#domain/entities/vertical.js';

import { PlaywrightCrawler } from '../../crawler/playwright-crawler.js';
import { RobotsChecker } from '../../crawler/robots-checker.js';

export abstract class BaseSourceAdapter implements SourcePort {
  abstract readonly identifier: string;
  abstract readonly defaultVertical: Vertical;
  protected robotsChecker = new RobotsChecker();
  protected readonly browser: PlaywrightCrawler;
  protected readonly logger = logger().child({ component: this.constructor.name });

  constructor(crawler?: PlaywrightCrawler) {
    this.browser = crawler || new PlaywrightCrawler();
  }

  abstract canHandle(url: string): boolean;

  /**
   * EL TEMPLATE METHOD: Define el algoritmo de extracción y recoge metadatos técnicos.
   */
  async extract(
    url: string,
    options?: { onSnapshot?: (html: string, stage: string) => Promise<void>; headless?: boolean },
  ): Promise<{ data: RawExtraction; html: string }> {
    const startTime = Date.now();

    // 1. Crawling técnico
    const result = await this.browser.fetch(url, {
      ...this.getCrawlerOptions(url),
      onSnapshot: options?.onSnapshot,
      headless: options?.headless,
    });

    const durationMs = Date.now() - startTime;
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
    };
  }

  /**
   * Lógica interna de extracción que utiliza Cheerio.
   */
  protected async performExtraction(
    $: CheerioAPI,
    url: string,
  ): Promise<Omit<RawExtraction, 'metadata'>> {
    return {
      source: this.identifier,
      externalId: this.extractId(url, $),
      url,
      name: this.extractTitle($),
      description: this.extractDescription($),
      address: this.extractAddress($),
      price: this.extractPrice($),
      phones: await this.extractPhones($, url),
      imageUrls: this.extractImagesFromDom($, this.getImageSelectors($)),
      vertical: this.detectVertical(url),
      attributes: this.extractAttributes($),
      extractedAt: new Date(),
    };
  }

  /**
   * Configuración específica para el Crawler de este portal
   */
  protected getCrawlerOptions(_url: string): any {
    return {
      cookieSelectors: this.getCookieSelectors(),
      onBeforeCapture: this.onBeforeCapture.bind(this),
    };
  }

  protected getCookieSelectors(): string[] {
    return [];
  }

  protected async onBeforeCapture(_page: any): Promise<void> {
    // Por defecto no hace nada, los hijos lo sobreescriben
  }

  // Métodos que CADA vertical u obrero debe decidir cómo implementar
  protected abstract extractId(url: string, $: CheerioAPI): string;
  protected abstract extractTitle($: CheerioAPI): string;
  protected abstract extractDescription($: CheerioAPI): string;
  protected abstract extractAddress($: CheerioAPI): string;
  protected abstract extractPrice($: CheerioAPI): number | undefined;
  protected abstract extractAttributes($: CheerioAPI): any;
  protected abstract getImageSelectors($: CheerioAPI): string[];

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

  /**
   * Extracción de imágenes con prioridad a los selectores específicos
   */
  protected extractImagesFromDom($: CheerioAPI, customSelectors: string[] = []): string[] {
    const imageUrls: string[] = [];
    const runSelectors = (selectors: string[]) => {
      $(selectors.join(',')).each((_: number, el: any) => {
        const $el = $(el);
        const src =
          $el.attr('src') ||
          $el.attr('data-src') ||
          $el.attr('data-lazy') ||
          $el.attr('data-original');
        if (src && src.startsWith('http') && !imageUrls.includes(src)) {
          if (!/logo|icon|avatar|pixel|spinner|gif/i.test(src)) imageUrls.push(src);
        }
      });
    };

    if (customSelectors.length > 0) runSelectors(customSelectors);
    if (imageUrls.length === 0) {
      runSelectors([
        'img[src*="static"]',
        'img[src*="images"]',
        '[class*="Multimedia"] img',
        '[class*="Photos"] img',
      ]);
    }
    return imageUrls;
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
