export interface MilescortsPhoto {
  src: string;
  alt?: string;
}

export interface MilescortsParams {
  age?: string;
  nationality?: string;
  city?: string;
}

export interface MilescortsPayload {
  /** Numeric ad ID from URL filename end: .../phone-slug-{id}.htm */
  sourceId: string;
  sourceUrl: string;
  title: string;
  nickname: string;
  bio?: string;
  params: MilescortsParams;
  phone?: string;
  whatsappPhone?: string;
  whatsappHref?: string;
  isVerified: boolean;
  photos: MilescortsPhoto[];
}
