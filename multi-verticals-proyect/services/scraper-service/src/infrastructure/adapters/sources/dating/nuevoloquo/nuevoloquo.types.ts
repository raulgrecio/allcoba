export interface NuevoloquoParams {
  age?: string;
  gender?: string;
  ethnicity?: string;
  hairColor?: string;
  weightKg?: string;
  heightCm?: string;
  measurements?: string;
  serviceType?: string;
  languages?: string[];
  locationCity?: string;
}

export interface NuevoloquoPhoto {
  readonly src: string;
}

export interface NuevoloquoPayload {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly nickname?: string;
  readonly bio?: string;
  readonly params: NuevoloquoParams;
  readonly photos: readonly NuevoloquoPhoto[];
  readonly isVerified: boolean;
  readonly hasVideo: boolean;
}
