export interface ParsedExif {
  readonly software?: string;
  readonly date?: string;
  readonly author?: string;
  readonly copyright?: string;
  readonly comments?: string;
  readonly gps?: {
    readonly lat: number;
    readonly lng: number;
    readonly alt?: number;
  };
}

export interface ProcessedImageResult {
  readonly id: string;
  readonly url: string;
  readonly status: 'ok' | 'rejected';
  readonly rejectReason?: string;
  readonly hashes: {
    readonly sha256: string;
    readonly phash: string;
  };
  readonly metadata: {
    readonly format: string;
    readonly width: number;
    readonly height: number;
    readonly size: number;
    readonly exif?: ParsedExif;
  };
  readonly ocrText: string;
  readonly stegoText: string;
  readonly detected: {
    readonly phones: string[];
    readonly emails: string[];
    readonly urls: string[];
    readonly brands: string[];
  };
  readonly flags: {
    readonly isNSFWCandidate: boolean;
    readonly hasSensitiveData: boolean;
    readonly hasText: boolean;
  };
  readonly adapterAssessment: {
    readonly hasInjectedInfo: boolean;
    readonly injectedInfoTypes: (
      | 'exif_software'
      | 'exif_copyright'
      | 'ocr_watermark_brand'
      | 'url_matched'
      | 'stego_hidden_brand'
    )[];
    readonly injectedInfoDetails: string[];
  };
  readonly normalizedBuffer?: Buffer;
  readonly thumbnailBuffer?: Buffer;
}
