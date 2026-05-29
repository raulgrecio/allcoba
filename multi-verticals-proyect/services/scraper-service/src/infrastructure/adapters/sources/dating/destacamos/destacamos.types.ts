export interface DestacamosPhoto {
  /** Full-size URL from a.fimage href */
  src: string;
  alt?: string;
}

export interface DestacamosParams {
  age?: string;
  nationality?: string;
  city?: string;
  zone?: string;
  postalCode?: string;
  heightRaw?: string;
  hairColor?: string;
  languages?: string[];
  schedule?: string;
}

export interface DestacamosPayload {
  /** Numeric ID extracted from /{id}- in URL */
  sourceId: string;
  sourceUrl: string;
  title: string;
  nickname: string;
  bio?: string;
  params: DestacamosParams;
  phone?: string;
  whatsappPhone?: string;
  whatsappHref?: string;
  isPremium: boolean;
  photos: DestacamosPhoto[];
}
