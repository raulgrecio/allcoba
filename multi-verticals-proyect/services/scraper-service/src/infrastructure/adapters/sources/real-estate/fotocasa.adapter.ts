import type { CheerioAPI } from 'cheerio';

import { RealEstateBaseAdapter } from './real-estate.base.js';

export class FotocasaAdapter extends RealEstateBaseAdapter {
  readonly identifier = 'fotocasa';

  canHandle(url: string): boolean {
    return url.includes('fotocasa.es');
  }

  protected extractId(url: string): string {
    const match = url.match(/\/(\d+)(\/|#|\?|$)/);
    return match && match[1] ? match[1]! : url.split('/').pop() || 'unknown';
  }

  protected extractTitle($: CheerioAPI): string {
    return $('h1').first().text().trim();
  }

  protected extractDescription($: CheerioAPI): string {
    return $('.re-DetailDescription-text, [class*="Description"]').text().trim();
  }

  protected extractAddress($: CheerioAPI): string {
    return $('.re-DetailMap-address, [class*="Map-address"]').text().trim();
  }

  protected getCookieSelectors(): string[] {
    return ['#didomi-notice-agree-button'];
  }

  protected async onBeforeCapture(page: any): Promise<void> {
    // Intentar ver el teléfono si hay un botón de "Llamar" o "Contactar"
    try {
      const contactBtn = page
        .locator(
          '[data-testid="view-phone-button"], button:has-text("Llamar"), button:has-text("Ver teléfono")',
        )
        .first();
      if (await contactBtn.isVisible({ timeout: 3000 })) {
        await contactBtn.click();
        // Esperamos 2 segundos para asegurar que el componente del teléfono se cargue
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      // No pasa nada si no hay botón
    }
  }

  protected getImageSelectors(): string[] {
    return [
      '.re-DetailPhotos-image',
      '.re-DetailMultimedia-image',
      '.re-DetailMultimedia-slider img',
      'img[src*="fotocasa.es/images"]',
    ];
  }

  protected extractRawPrice($: CheerioAPI): string {
    return $('.re-DetailHeader-price, .re-DetailHeader-price--primary').first().text().trim();
  }

  protected async extractPhones($: CheerioAPI): Promise<string[]> {
    const phones: string[] = [];
    // Selector ultra-específico basado en el data-testid revelado
    const phoneText = $(
      '[data-testid="view-phone-button"] strong, .re-DetailContact-phone, [href^="tel:"]',
    )
      .first()
      .text()
      .trim();
    if (phoneText) {
      phones.push(phoneText.replace(/\s/g, ''));
    }
    return phones;
  }

  protected extractRooms($: CheerioAPI): number | undefined {
    // 1. Intento por Clase específica (Fotocasa)
    const element = $(
      '.re-DetailHeader-rooms, .re-DetailHeader-featuresItem:contains("hab")',
    ).first();
    const text = element.text();
    const match = text.match(/(\d+)/);
    if (match && match[1]) return parseInt(match[1], 10);

    // 2. Fallback por Texto en descripción
    const description = this.extractDescription($);
    return description
      ? this.parseFromText(description, [/(\d+)\s*hab/i, /(\d+)\s*dormitorio/i, /(\d+)\s*studi/i])
      : undefined;
  }
  protected extractBathrooms($: CheerioAPI): number | undefined {
    // 1. Intento por Clase específica (Fotocasa)
    const element = $(
      '.re-DetailHeader-bathrooms, .re-DetailHeader-featuresItem:contains("baño")',
    ).first();
    const text = element.text();
    const match = text.match(/(\d+)/);
    if (match && match[1]) return parseInt(match[1], 10);

    // 2. Fallback por Texto en descripción
    const description = this.extractDescription($);
    return description
      ? this.parseFromText(description, [/(\d+)\s*baño/i, /(\d+)\s*aseo/i])
      : undefined;
  }
  protected extractSurface($: CheerioAPI): number | undefined {
    // 1. Intento por Clase específica (Fotocasa)
    const element = $(
      '.re-DetailHeader-surface, .re-DetailHeader-featuresItem:contains("m²")',
    ).first();
    const text = element.text();
    const match = text.match(/(\d+)/);
    if (match && match[1]) return parseInt(match[1], 10);

    // 2. Fallback por Texto en descripción
    const description = this.extractDescription($);
    return description
      ? this.parseFromText(description, [/(\d+)\s*m²/i, /(\d+)\s*metros/i])
      : undefined;
  }
  protected extractHasAscensor($: CheerioAPI): boolean | undefined {
    // En los extras, buscamos cualquier elemento que mencione el ascensor por accesibilidad
    const hasAscensor = $('[aria-label*="ascensor"], [aria-labelledby*="elevator"]').length > 0;
    if (hasAscensor) return true;
    // Fallback: buscar en el texto de los elementos que tengan etiquetas de características
    const allFeatures = $('[aria-label], [aria-labelledby]').text().toLowerCase();
    return allFeatures.includes('ascensor') ? true : undefined;
  }

  protected extractAttributes($: CheerioAPI): any {
    return {
      rooms: this.extractRooms($),
      bathrooms: this.extractBathrooms($),
      surface: this.extractSurface($),
      hasAscensor: this.extractHasAscensor($),
      rawFeatures: this.collectRawFeatures(
        $,
        '.re-DetailFeaturesList-feature, .re-ContentDetail-featuresListWrapper li',
      ),
    };
  }
}
