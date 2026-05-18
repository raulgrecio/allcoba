import fs from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const HTML_DIR = path.resolve(__dirname, '..', 'fixtures', 'html');

export const listHtmlFixtures = (): readonly string[] => {
  return fs
    .readdirSync(HTML_DIR)
    .filter((f) => f.endsWith('.html'))
    .sort();
};

export const loadHtmlFixture = (filename: string): string => {
  return fs.readFileSync(path.join(HTML_DIR, filename), 'utf-8');
};
