export enum VerificationStatus {
  AUTOMATIC_MATCH = 'AUTOMATIC_MATCH',
  PENDING_REVIEW = 'PENDING_REVIEW',
  REJECTED = 'REJECTED',
  VERIFIED_MANUAL = 'VERIFIED_MANUAL',
}

type SignalType = 'IMAGE_MATCH' | 'TEXT_SIMILARITY' | 'PHONE_MATCH' | 'LOCATION_MATCH' | 'TELEGRAM_MATCH';

export interface ScraperSignal {
  type: SignalType;
  sourceId: string;
  confidence: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface Provider<T = Record<string, any>> {
  id: string;
  displayName?: string;
  phones: string[];
  telegram?: string;
  email?: string;
  address?: {
    text: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  description?: string;
  images: string[];
  imageHashes: string[]; // Hashes perceptuales (pHash) para deduplicación visual
  vertical: string; // 'REAL_ESTATE', 'MOTOR', etc.
  externalIds: Record<string, string>;
  verificationStatus: VerificationStatus;
  confidenceScore: number;
  signals: ScraperSignal[];
  attributes: T; // Datos específicos de la vertical
  metadata: Record<string, any>; // Datos técnicos del scraper (last_ip, user_agent, etc)
  lastScrapedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProviderCriteria {
  phone?: string;
  telegram?: string;
  email?: string;
  externalId?: {
    source: string;
    id: string;
  };
  vertical?: string;
  location?: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
}
