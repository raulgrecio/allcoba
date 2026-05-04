import type { CheerioAPI } from 'cheerio';

import { Vertical } from '../../../../domain/entities/vertical.js';
import { BaseSourceAdapter } from '../base-source.adapter.js';

export class WallapopAdapter extends BaseSourceAdapter {
  readonly identifier = 'wallapop';
  readonly defaultVertical = Vertical.GENERAL;

  canHandle(url: string): boolean {
    return url.includes('wallapop.com');
  }

  protected extractId(url: string): string {
    return url.split('-').pop() || url;
  }

  protected extractTitle($: CheerioAPI): string {
    return $('h1').text().trim();
  }

  protected extractDescription($: CheerioAPI): string {
    return $('.item-detail-description').text().trim();
  }

  protected extractAddress($: CheerioAPI): string {
    return $('.item-detail-location').text().trim();
  }

  protected extractPrice($: CheerioAPI): number | undefined {
    const priceText = $('.item-detail-price').text().trim();
    const numeric = priceText.replace(/[^0-9]/g, '');
    return numeric ? parseInt(numeric, 10) : undefined;
  }

  protected getImageSelectors(): string[] {
    return ['.item-detail-images img'];
  }

  protected detectVertical(url: string): Vertical {
    if (url.includes('c11545-coches')) return Vertical.MOTOR;
    if (url.includes('c11098-inmobiliaria')) return Vertical.REAL_ESTATE;
    if (url.includes('c12485-servicios')) return Vertical.SERVICES;
    return Vertical.GENERAL;
  }

  protected extractAttributes($: CheerioAPI): any {
    return { verticalDetected: this.detectVertical('') };
  }
}
