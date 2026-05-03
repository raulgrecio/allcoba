import { PlaywrightCrawler } from "../../crawler/playwright-crawler.js";
import type {
  SourcePort,
  RawExtraction,
} from "../../../application/ports/source.port.js";
import { Vertical } from "../../../domain/entities/vertical.js";
import { RobotsChecker } from "../../crawler/robots-checker.js";
import type { CheerioAPI } from "cheerio";
import * as cheerio from "cheerio";

export abstract class BaseSourceAdapter implements SourcePort {
  abstract readonly identifier: string;
  abstract readonly defaultVertical: Vertical;
  protected robotsChecker = new RobotsChecker();
  protected readonly browser: PlaywrightCrawler;

  constructor() {
    this.browser = new PlaywrightCrawler();
  }

  abstract canHandle(url: string): boolean;

  /**
   * EL TEMPLATE METHOD: Define el algoritmo de extracción.
   */
  async extract(url: string): Promise<RawExtraction> {
    const html = await this.browser.fetch(url);
    const $ = cheerio.load(html);

    return {
      source: this.identifier,
      externalId: this.extractId(url, $),
      url,
      name: this.extractTitle($),
      description: this.extractDescription($),
      address: this.extractAddress($),
      price: this.extractPrice($), // precio base de referencia
      phones: await this.extractPhones($, url),
      imageUrls: this.extractImagesFromDom($, this.getImageSelectors($)),
      vertical: this.detectVertical(url),
      attributes: this.extractAttributes($),
      extractedAt: new Date(),
    };
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
  protected async extractPhones(
    _$: CheerioAPI,
    _url: string,
  ): Promise<string[]> {
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
  protected extractImagesFromDom(
    $: CheerioAPI,
    customSelectors: string[] = [],
  ): string[] {
    const imageUrls: string[] = [];
    const runSelectors = (selectors: string[]) => {
      $(selectors.join(",")).each((_: number, el: any) => {
        const $el = $(el);
        const src =
          $el.attr("src") ||
          $el.attr("data-src") ||
          $el.attr("data-lazy") ||
          $el.attr("data-original");
        if (src && src.startsWith("http") && !imageUrls.includes(src)) {
          if (!/logo|icon|avatar|pixel|spinner|gif/i.test(src))
            imageUrls.push(src);
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
}
