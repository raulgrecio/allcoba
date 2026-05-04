import type { CheerioAPI } from 'cheerio';

import { MotorBaseAdapter } from './motor.base.js';

export class CochesNetAdapter extends MotorBaseAdapter {
  readonly identifier = 'coches.net';

  canHandle(url: string): boolean {
    return url.includes('coches.net');
  }

  protected extractId(url: string): string {
    return url.split('/').pop() || url;
  }

  protected extractTitle($: CheerioAPI): string {
    return $('h1').text().trim();
  }

  protected extractDescription($: CheerioAPI): string {
    return $('.mt-Description').text().trim();
  }

  protected extractAddress($: CheerioAPI): string {
    return $('.mt-Location').text().trim();
  }

  protected getImageSelectors(): string[] {
    return ['.mt-Gallery img'];
  }

  protected extractRawPrice($: CheerioAPI): string {
    return $('.mt-Price').text().trim();
  }

  protected extractYear($: CheerioAPI): number | undefined {
    return undefined;
  }
  protected extractKilometers($: CheerioAPI): number | undefined {
    return undefined;
  }
  protected extractFuel($: CheerioAPI): string | undefined {
    return undefined;
  }
  protected extractTransmission($: CheerioAPI): string | undefined {
    return undefined;
  }
  protected extractPower($: CheerioAPI): number | undefined {
    return undefined;
  }
}
