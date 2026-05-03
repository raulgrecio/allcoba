import { PlaywrightCrawler } from '../../crawler/playwright-crawler.js';
import type { SourcePort, RawExtraction } from '../../../application/ports/source.port.js';
import { Vertical } from '../../../domain/entities/vertical.js';
import { RobotsChecker } from '../../crawler/robots-checker.js';
import type { CheerioAPI } from 'cheerio';

export abstract class BaseSourceAdapter implements SourcePort {
  abstract readonly identifier: string;
  abstract readonly defaultVertical: Vertical;
  protected robotsChecker = new RobotsChecker();
  protected readonly browser: PlaywrightCrawler;

  constructor() {
    this.browser = new PlaywrightCrawler();
  }

  abstract canHandle(url: string): boolean;
  abstract extract(url: string): Promise<RawExtraction>;

  protected detectVertical(url: string): Vertical {
    return this.defaultVertical;
  }

  async isAllowed(url: string): Promise<boolean> {
    return this.robotsChecker.isAllowed(url);
  }

  /**
   * Método de utilidad para extraer imágenes del DOM.
   * 
   * ESTRATEGIA:
   * 1. Si se pasan 'customSelectors', se usan EN EXCLUSIVA (Modo estricto).
   * 2. Si no se pasan o fallan, se usan los selectores genéricos (Modo emergencia/descubrimiento).
   */
  protected extractImagesFromDom($: CheerioAPI, customSelectors: string[] = []): string[] {
    const imageUrls: string[] = [];
    
    // Función interna para procesar una lista de selectores
    const runSelectors = (selectors: string[]) => {
      $(selectors.join(',')).each((_: number, el: any) => {
        const $el = $(el);
        const src = $el.attr('src') || $el.attr('data-src') || $el.attr('data-lazy') || $el.attr('data-original');
        
        if (src && src.startsWith('http') && !imageUrls.includes(src)) {
          // Filtro básico anti-ruido (opcional pero recomendado)
          const isNoise = /logo|icon|avatar|pixel|spinner|gif/i.test(src);
          if (!isNoise) {
            imageUrls.push(src);
          }
        }
      });
    };

    // 1. Intentar con los selectores específicos si existen
    if (customSelectors.length > 0) {
      runSelectors(customSelectors);
    }

    // 2. Si no hay resultados o no había selectores, usar la "aspiradora" genérica
    if (imageUrls.length === 0) {
      const genericSelectors = [
        'img[src*="static"]',
        'img[src*="images"]',
        'img[src*="photo"]',
        'img[class*="image"]',
        'img[class*="photo"]',
        'img[class*="gallery"]',
        '[class*="Multimedia"] img',
        '[class*="Photos"] img'
      ];
      runSelectors(genericSelectors);
    }

    return imageUrls;
  }
}
