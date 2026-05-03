import { BaseSourceAdapter } from './base-source.adapter.js';
import type { RawExtraction } from '../../../application/ports/source.port.js';
import { Vertical } from '../../../domain/entities/vertical.js';
import { logger } from '@allcoba/kernel';

export class IdealistaAdapter extends BaseSourceAdapter {
  readonly identifier = 'idealista';
  readonly defaultVertical = Vertical.REAL_ESTATE;

  canHandle(url: string): boolean {
    return url.includes('idealista.com');
  }

  async extract(url: string): Promise<RawExtraction> {
    logger().info({ url }, 'Iniciando extracción de Idealista con Playwright');
    
    const html = await this.browser.fetch(url);
    const $ = (await import('cheerio')).load(html);
    
    const title = $('.main-info__title-main').text().trim();
    const priceText = $('.info-data-price').text().trim();
    const description = $('.adCommentsLanguageSelector').text().trim();
    const address = $('.main-info__title-minor').text().trim();
    
    // Extraer imágenes usando el método genérico de la clase base
    const imageUrls = this.extractImagesFromDom($);

    return {
      source: this.identifier,
      externalId: this.extractId(url),
      url,
      name: title,
      description,
      address,
      phones: [], // El teléfono requiere un clic, lo veremos en el siguiente paso
      imageUrls,
      vertical: this.detectVertical(url),
      attributes: {
        price: this.parsePrice(priceText),
        rawPrice: priceText,
      },
      extractedAt: new Date()
    };
  }

  private extractId(url: string): string {
    const match = url.match(/\/(inmueble|pro|motor)\/(\d+)/);
    return match ? match[2] : url.split('/').pop() || url;
  }

  private parsePrice(priceText: string): number | undefined {
    const numeric = priceText.replace(/[^0-9]/g, '');
    return numeric ? parseInt(numeric, 10) : undefined;
  }
}
