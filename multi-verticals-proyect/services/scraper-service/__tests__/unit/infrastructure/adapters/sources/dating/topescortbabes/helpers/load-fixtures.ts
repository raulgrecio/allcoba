import fs from 'fs';
import path from 'path';
import url from 'url';

import type { TopEscortBabesPayload } from '#infrastructure/adapters/sources/dating/topescortbabes/topescortbabes.types.js';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, '..', 'fixtures');
const HTML_DIR = path.join(FIXTURES_DIR, 'html');

export interface Fixture {
  readonly filename: string;
  readonly payload: TopEscortBabesPayload;
}

export const listFixtureFiles = (): readonly string[] => {
  return fs
    .readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();
};

export const loadFixture = (filename: string): Fixture => {
  const raw = fs.readFileSync(path.join(FIXTURES_DIR, filename), 'utf-8');
  const payload = JSON.parse(raw) as TopEscortBabesPayload;
  return { filename, payload };
};

export const loadAllFixtures = (): readonly Fixture[] => {
  return listFixtureFiles().map(loadFixture);
};

export const listHtmlFixtures = (): readonly string[] => {
  return fs
    .readdirSync(HTML_DIR)
    .filter((f) => f.endsWith('.html'))
    .sort();
};

export const loadHtmlFixture = (filename: string): string => {
  return fs.readFileSync(path.join(HTML_DIR, filename), 'utf-8');
};
