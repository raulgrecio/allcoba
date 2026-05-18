export interface MilpasionesPhoto {
  src: string;
}

export interface MilpasionesParams {
  city?: string;
}

export interface MilpasionesPayload {
  /** Numeric ad ID: _(\d+) from URL */
  sourceId: string;
  sourceUrl: string;
  /** Raw og:title — includes phone prefix */
  title: string;
  nickname: string;
  /** og:description */
  bio?: string;
  params: MilpasionesParams;
  /** 9-digit Spanish phone from URL filename */
  phone?: string;
  photos: MilpasionesPhoto[];
}
