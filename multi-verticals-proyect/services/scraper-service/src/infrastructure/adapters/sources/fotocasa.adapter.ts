import { BaseSourceAdapter } from './base-source.adapter.js';
import type { RawExtraction } from '../../../application/ports/source.port.js';
import { logger } from '@allcoba/kernel';

export class FotocasaAdapter extends BaseSourceAdapter {
  readonly identifier = 'fotocasa';

  canHandle(url: string): boolean {
    return url.includes('fotocasa.es');
  }

  async extract(url: string): Promise<RawExtraction> {
    logger().info({ url }, 'Iniciando extracción de Fotocasa con Playwright');
    
    const html = await this.browser.fetch(url);
    const $ = (await import('cheerio')).load(html);
    
    // Selectores más flexibles
    const title = $('h1').first().text().trim();
    const priceText = $('.re-DetailHeader-price, .re-DetailHeader-price--primary').first().text().trim();
    const description = $('.re-DetailDescription-text, [class*="Description"]').text().trim();
    const address = $('.re-DetailMap-address, [class*="Map-address"]').text().trim();
    
    // Extraer imágenes (más agresivo con múltiples selectores)
    const imageUrls: string[] = [];
    const imageSelectors = [
      '.re-DetailPhotos-image',
      '.re-DetailMultimedia-image',
      '.re-DetailMultimedia-slider img',
      'img[src*="fotocasa.es/images"]'
    ];

    $(imageSelectors.join(',')).each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src') || $(el).attr('data-lazy');
      if (src && !imageUrls.includes(src)) {
        // Limpiar URLs relativas o raras
        if (src.startsWith('http')) imageUrls.push(src);
      }
    });

    // Si no encuentra nada, probar a buscar todas las imágenes dentro del bloque multimedia
    if (imageUrls.length === 0) {
      $('[class*="Multimedia"], [class*="Photos"]').find('img').each((_, el) => {
        const src = $(el).attr('src') || $(el).attr('data-src');
        if (src && src.startsWith('http') && !imageUrls.includes(src)) imageUrls.push(src);
      });
    }

    return {
      source: this.identifier,
      externalId: this.extractId(url),
      url,
      name: title,
      description,
      address,
      phones: [], 
      imageUrls,
      vertical: 'REAL_ESTATE',
      attributes: {
        price: this.parsePrice(priceText),
        rawPrice: priceText,
      },
      extractedAt: new Date()
    };
  }

  private extractId(url: string): string {
    // Fotocasa suele usar un ID numérico antes del último slash o al final
    // Ejemplo: .../188764809/d o .../188764809
    const match = url.match(/\/(\d+)(\/|#|\?|$)/);
    return match ? match[1]! : url.split('/').pop() || 'unknown';
  }

  private parsePrice(priceText: string): number | undefined {
    const numeric = priceText.replace(/[^0-9]/g, '');
    return numeric ? parseInt(numeric, 10) : undefined;
  }
}
