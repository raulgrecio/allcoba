export interface ArdientePlacerPhoto {
  /** Full-size URL: /anuncios/{id}/{id}-{imgid}-g.jpg */
  src: string;
  alt?: string;
}

export interface ArdientePlacerRate {
  duration: '1h';
  incall: number;
}

export interface ArdientePlacerParams {
  age?: string;
  nationality?: string;
  city?: string;
  /** Raw "80 €/hora" string from entry-meta */
  rateRaw?: string;
}

export interface ArdientePlacerPayload {
  /** Numeric ad ID — last URL path segment */
  sourceId: string;
  sourceUrl: string;
  title: string;
  nickname: string;
  bio?: string;
  params: ArdientePlacerParams;
  services: string[];
  phone?: string;
  whatsappPhone?: string;
  whatsappHref?: string;
  photos: ArdientePlacerPhoto[];
}
