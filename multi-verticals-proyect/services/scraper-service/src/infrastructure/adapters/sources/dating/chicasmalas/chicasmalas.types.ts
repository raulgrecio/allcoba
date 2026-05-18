export interface ChicasmalasPhoto {
  src: string;
}

export interface ChicasmalasPayload {
  sourceId: string;
  sourceUrl: string;
  title?: string;
  nickname?: string;
  bio?: string;
  phone?: string;
  whatsappPhone?: string;
  photos: ChicasmalasPhoto[];
  city?: string;
  isVerified: boolean;
}
