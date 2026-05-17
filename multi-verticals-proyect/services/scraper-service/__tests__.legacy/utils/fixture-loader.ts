import * as fs from 'fs';
import * as path from 'path';

export interface DatingFixture {
  html: string;
  json: any;
}

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures', 'infrastructure', 'adapters', 'sources', 'dating');

export function loadDatingFixture(name: string): DatingFixture {
  const htmlPath = path.join(FIXTURES_DIR, `${name}.html`);
  const jsonPath = path.join(FIXTURES_DIR, `${name}.json`);

  if (!fs.existsSync(htmlPath)) {
    throw new Error(`Fixture HTML not found: ${htmlPath}`);
  }
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Fixture JSON not found: ${jsonPath}`);
  }

  return {
    html: fs.readFileSync(htmlPath, 'utf8'),
    json: JSON.parse(fs.readFileSync(jsonPath, 'utf8')),
  };
}

export function listDatingFixtures(): string[] {
  return fs.readdirSync(FIXTURES_DIR)
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''));
}
