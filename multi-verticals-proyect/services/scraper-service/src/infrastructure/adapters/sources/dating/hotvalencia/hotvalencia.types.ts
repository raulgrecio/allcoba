export interface HotvalenciaPhoto {
  readonly src: string;
}

export interface HotvalenciaPayload {
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly nickname?: string;
  readonly bio?: string;
  readonly phone?: string;
  readonly photos: readonly HotvalenciaPhoto[];
  readonly hasVideo: boolean;
}
