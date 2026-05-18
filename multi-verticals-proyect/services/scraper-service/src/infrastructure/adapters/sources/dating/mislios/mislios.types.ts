export interface MisliosPhoto {
  readonly src: string;
}

export interface MisliosPayload {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly nickname?: string;
  readonly bio?: string;
  readonly phone?: string;
  readonly photos: readonly MisliosPhoto[];
}
