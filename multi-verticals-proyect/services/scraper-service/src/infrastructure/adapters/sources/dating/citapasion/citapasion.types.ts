export interface CitapasionPhoto {
  readonly src: string;
}

export interface CitapasionParams {
  readonly age?: number;
  readonly heightCm?: number;
  readonly weightKg?: number;
  readonly hairColor?: string;
  readonly hairLength?: string;
  readonly eyeColor?: string;
  readonly ethnicity?: string;
  readonly nationality?: string;
  readonly languages?: string[];
  readonly tattoos?: boolean;
  readonly piercings?: boolean;
  readonly smoker?: boolean;
  readonly city?: string;
  readonly zone?: string;
}

export interface CitapasionPayload {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly nickname?: string;
  readonly bio?: string;
  readonly phone?: string;
  readonly whatsappPhone?: string;
  readonly params: CitapasionParams;
  readonly photos: readonly CitapasionPhoto[];
  readonly siteRating?: { readonly score: number; readonly count: number };
}
