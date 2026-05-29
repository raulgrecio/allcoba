import type { ParsedExif } from '#domain/canonical/processed-image-result.js';

export interface ExifParserPort {
  parse(buffer: Buffer): Promise<ParsedExif | undefined>;
}
