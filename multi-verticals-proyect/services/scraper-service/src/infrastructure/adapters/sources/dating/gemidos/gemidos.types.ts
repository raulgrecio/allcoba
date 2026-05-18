export interface GemidosPhoto {
  readonly src: string;
}

export interface GemidosParams {
  readonly age?: number;
  readonly heightCm?: number;
  readonly weightKg?: number;
  readonly measurements?: string;
  readonly nationality?: string;
  readonly ethnicity?: string;
  readonly services?: string[];
}

export interface GemidosPayload {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly nickname?: string;
  readonly bio?: string;
  readonly phone?: string;
  readonly params: GemidosParams;
  readonly photos: readonly GemidosPhoto[];
  readonly isVerified: boolean;
}
