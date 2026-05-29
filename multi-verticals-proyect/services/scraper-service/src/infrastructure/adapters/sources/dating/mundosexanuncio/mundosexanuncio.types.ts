export interface MundosexanuncioPhoto {
  readonly src: string;
}

export interface MundosexanuncioPayload {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly nickname?: string;
  readonly bio?: string;
  readonly phone?: string;
  readonly whatsappPhone?: string;
  readonly city?: string;
  readonly zone?: string;
  readonly age?: number;
  readonly photos: readonly MundosexanuncioPhoto[];
}
