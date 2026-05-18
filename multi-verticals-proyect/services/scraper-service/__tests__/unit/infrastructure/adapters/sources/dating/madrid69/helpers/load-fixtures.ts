import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FIXTURES_DIR = join(fileURLToPath(import.meta.url), '../..', 'fixtures');

export const loadHtml = (filename: string): string =>
  readFileSync(join(FIXTURES_DIR, 'html', filename), 'utf-8');

export const loadJson = (filename: string): unknown =>
  JSON.parse(readFileSync(join(FIXTURES_DIR, 'json', filename), 'utf-8')) as unknown;
