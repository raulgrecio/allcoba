export interface EscortAdvisorPhoto {
  readonly src: string;
}

export interface EscortAdvisorParams {
  readonly age?: number;
  readonly heightCm?: number;
  readonly weightKg?: number;
  readonly nationality?: string;
  readonly ethnicity?: string;
  readonly services?: string[];
}

export interface EscortAdvisorPayload {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly nickname?: string;
  readonly bio?: string;
  readonly phone?: string;
  readonly params: EscortAdvisorParams;
  readonly photos: readonly EscortAdvisorPhoto[];
  readonly isVerified: boolean;
}
