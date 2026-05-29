export interface OcrPort {
  extractText(buffer: Buffer): Promise<string>;
}
