import { RealEstateBaseAdapter } from './real-estate.base.js';
import type { CheerioAPI } from 'cheerio';

export class FotocasaAdapter extends RealEstateBaseAdapter {
  readonly identifier = 'fotocasa';

  canHandle(url: string): boolean {
    return url.includes('fotocasa.es');
  }

  protected extractId(url: string): string {
    const match = url.match(/\/(\d+)(\/|#|\?|$)/);
    return match ? match[1]! : url.split('/').pop() || 'unknown';
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
      const contactBtn = page.locator('button:has-text("Llamar"), button:has-text("Ver teléfono")').first();
      if (await contactBtn.isVisible({ timeout: 3000 })) {
        await contactBtn.click();
        await page.waitForTimeout(1000); // Esperar a que aparezca el número
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
      'img[src*="fotocasa.es/images"]'
    ];
  }

  protected extractRawPrice($: CheerioAPI): string {
    return $('.re-DetailHeader-price, .re-DetailHeader-price--primary').first().text().trim();
  }

  protected async extractPhones($: CheerioAPI): Promise<string[]> {
    const phones: string[] = [];
    const phoneText = $('.re-DetailContact-phone, [class*="Contact-phone"]').text().trim();
    if (phoneText) {
      phones.push(phoneText.replace(/\s/g, ''));
    }
    return phones;
  }

protected extractRooms($: CheerioAPI): number | undefined {
  // 1. Intento por DOM/Aria
  const element = $('[aria-label*="habitaciones"], [aria-label*="dormitorios"], [aria-labelledby*="rooms"]').first();
  const text = element.text() || element.parent().text();
  const match = text.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);

  // 2. Fallback por Texto en descripción
  return this.parseFromText(this.extractDescription($), [/(\d+)\s*hab/i, /(\d+)\s*dormitorio/i, /(\d+)\s*studi/i]);
}
protected extractBathrooms($: CheerioAPI): number | undefined {
  // 1. Intento por DOM/Aria
  const element = $('[aria-label*="baño"], [aria-labelledby*="bathrooms"]').first();
  const text = element.text() || element.parent().text();
  const match = text.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);

  // 2. Fallback por Texto en descripción
  return this.parseFromText(this.extractDescription($), [/(\d+)\s*baño/i, /(\d+)\s*aseo/i]);
}
protected extractSurface($: CheerioAPI): number | undefined {
  // 1. Intento por DOM/Aria
  const element = $('[aria-label*="superficie"], [aria-label*="m²"], [aria-labelledby*="surface"]').first();
  const text = element.text() || element.parent().text();
  const match = text.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);

  // 2. Fallback por Texto en descripción
  return this.parseFromText(this.extractDescription($), [/(\d+)\s*m²/i, /(\d+)\s*metros/i]);
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
    rawFeatures: this.collectRawFeatures($,
      '.re-DetailFeaturesList-feature, .re-ContentDetail-featuresListWrapper li'
    )
  };
}
}
