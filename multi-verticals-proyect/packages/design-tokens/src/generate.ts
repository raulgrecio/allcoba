import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRootLogger } from '@allcoba/kernel';
import { generateCSS } from './css-gen.js';
import { generateDart } from './dart-gen.js';

const logger = createRootLogger({ service: 'design-tokens' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

writeFileSync(resolve(root, 'tokens.css'), generateCSS(), 'utf-8');
logger.info('tokens.css generated');

writeFileSync(resolve(root, 'tokens.dart'), generateDart(), 'utf-8');
logger.info('tokens.dart generated');
