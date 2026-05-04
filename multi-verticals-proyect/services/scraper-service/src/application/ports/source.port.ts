import type { Vertical } from '../../domain/entities/vertical.js';

export interface RawExtraction<T = Record<string, any>> {
  source: string;
  externalId: string;
  url: string;
  name?: string;
  description?: string;
  phones: string[];
  telegram?: string;
  email?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
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
    serverIp?: string;
    outboundIp?: string;
    statusCode: number;
    debugFile?: string;
  };
}

export interface SourcePort {
  /** Identificador único de la fuente (ej: 'idealista') */
  readonly identifier: string;

  /** Determina si este adaptador puede manejar la URL dada */
  canHandle(url: string): boolean;

  /** Extrae los datos crudos de la página y devuelve también el HTML original */
  extract(url: string): Promise<{ data: RawExtraction; html: string }>;

  /** Verifica robots.txt para esta fuente */
  isAllowed(url: string): Promise<boolean>;
}
