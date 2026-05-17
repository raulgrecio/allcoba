import type { CheerioAPI } from 'cheerio';

import type { CurrencyCode } from '@allcoba/shared-types';



import { BaseSourceAdapter } from '../base-source.adapter.js';

export class DiscoveryAdapter extends BaseSourceAdapter {
  readonly identifier = 'discovery';
  readonly defaultVertical = 'general' as const;
  readonly defaultCountry = 'ES';
  readonly defaultCurrency: CurrencyCode = 'EUR';

  /**
   * Catch-all: Este adaptador acepta cualquier URL como último recurso.
   */
  canHandle(_url: string): boolean {
    return true;
  }

  protected extractId(url: string): string {
    // Generar un ID basado en el hash de la URL para que sea consistente
    // Usamos una porción más larga para evitar colisiones en dominios similares
    const hash = Buffer.from(url)
      .toString('base64')
      .replace(/[^a-z0-9]/gi, '');
    const shortHash = hash.substring(0, 8) + hash.substring(hash.length - 8);
    return `disc_${shortHash}`;
  }

  protected extractTitle($: CheerioAPI): string {
    return $('title').text().trim() || $('h1').first().text().trim() || 'Sin título';
  }

  protected extractDescription($: CheerioAPI): string {
    return (
      $('meta[name="description"]').attr('content') ||
      $('meta[property="og:description"]').attr('content') ||
      ''
    );
  }

  protected extractPrice(): number | undefined {
    return undefined;
  }

  protected extractAttributes(): any {
    return {
      isDiscovery: true,
      extractedAt: new Date().toISOString(),
    };
  }

  protected getImageSelectors(): string[] {
    // En modo descubrimiento, intentamos pillar imágenes genéricas de productos/artículos
    return ['meta[property="og:image"]', 'article img', '.product img', 'main img', '#content img'];
  }

  /**
   * Sobrescribimos para no ser tan estrictos con robots en modo descubrimiento manual,
   * aunque BaseSourceAdapter ya lo gestiona.
   */
  async isAllowed(_url: string): Promise<boolean> {
    return true; // Permitimos descubrimiento manual
  }
}
