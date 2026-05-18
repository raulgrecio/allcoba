export interface NuevapasionPhoto {
  readonly src: string;
}

export interface NuevapasionPayload {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly nickname?: string;
  readonly bio?: string;
  readonly phone?: string;
  readonly whatsappPhone?: string;
  readonly photos: readonly NuevapasionPhoto[];
}
