import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES_DIR = join(
  fileURLToPath(import.meta.url),
  '../..',
  'fixtures',
  'html',
);

export const loadHtml = (filename: string): string =>
  readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
