import type { Vertical } from '@allcoba/shared-types';

import type { CrawlerOptions } from '#application/ports/crawler.port.js';

/** Raw contact link extracted from source — platform is a free string, not a canonical ContactOption. */
export interface RawContact {
  platform: string;
  handle: string;
}

export interface LocationInfo {
  address?: string;
  country?: string;
  city?: string;
  region?: string;
  zone?: string;
  postalCode?: string;
  timezone?: string;
  coordinates?: { lat: number; lng: number };
}

export interface RawExtraction<T = Record<string, any>> {
  source: string;
  externalId: string;
  url: string;
  name?: string;
  description?: string;
  phones: string[];
  email?: string;
  contacts?: RawContact[];
  location: LocationInfo;
  imageUrls: string[];
  vertical: Vertical;
  price?: number;
  currency?: string;
  attributes: T;
  extractedAt: Date;
  metadata: {
    timestamp: string;
    durationMs: number;
    sourceUrl: string;
    userAgent: string;
    serverIp?: string;
    outboundIp?: string;
    statusCode: number;
    debugFile?: string;
    networkFiles?: string[];
  };
}

export interface SourcePort {
  /** Identificador único de la fuente (ej: 'idealista') */
  readonly identifier: string;

  /** Vertical por defecto de esta fuente */
  readonly defaultVertical: Vertical;

  /** Determina si este adaptador puede manejar la URL dada */
  canHandle(url: string): boolean;

  /** Extrae los datos crudos de la página y devuelve también el HTML original */
  extract(
    url: string,
    options?: CrawlerOptions & {
      html?: string;
    },
  ): Promise<{
    data: RawExtraction;
    html: string;
    networkResponses?: Array<{ url: string; status: number; body: string; contentType: string }>;
  }>;

  /** Determina si una URL pertenece a un perfil individual (vs a un listado) */
  isProfileUrl(url: string): boolean;

  /** Extrae URLs de perfiles desde el HTML de un listado */
  extractProfileLinks(html: string, baseUrl: string): string[];

  /** Extrae la URL de la siguiente página desde el HTML de un listado */
  extractNextPageUrl(html: string, baseUrl: string): string | undefined;

  /** Expone la configuración del Crawler (cookies, interacciones previas) */
  getCrawlerOptions(url: string, options?: any): any;

  /** Fetches a page HTML using the source's own security strategy */
  fetchHtml(
    url: string,
    options?: {
      waitUntil?: CrawlerOptions['waitUntil'];
      skipInteractions?: boolean;
      headless?: boolean;
    },
  ): Promise<{ html: string }>;

  /** Verifica robots.txt para esta fuente */
  isAllowed(url: string): Promise<boolean>;
}
