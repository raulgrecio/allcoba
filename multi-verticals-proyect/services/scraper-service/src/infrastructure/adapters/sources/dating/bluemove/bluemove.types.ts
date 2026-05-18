export interface BluemovePhoto {
  readonly src: string;
}

export interface BluemoveParams {
  readonly age?: number;
  readonly heightCm?: number;
  readonly weightKg?: number;
  readonly hairColor?: string;
  readonly eyeColor?: string;
  readonly breastSize?: string;
  readonly pubicHair?: string;
  readonly nationality?: string;
  readonly languages?: string[];
  readonly tattoos?: boolean;
  readonly piercings?: boolean;
  readonly city?: string;
  readonly zone?: string;
  readonly services?: string[];
  readonly paymentMethods?: string[];
  readonly serviceLocations?: string[];
}

export interface BluemovePayload {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly nickname?: string;
  readonly bio?: string;
  readonly phone?: string;
  readonly whatsappPhone?: string;
  readonly telegram?: string;
  readonly instagram?: string;
  readonly params: BluemoveParams;
  readonly photos: readonly BluemovePhoto[];
  readonly isVerified: boolean;
}
