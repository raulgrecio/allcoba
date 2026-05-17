import fs from 'node:fs';
import path from 'node:path';

import { SourceRegistry } from '#infrastructure/adapters/sources/source.registry.js';

import { CrawlerDispatcher } from '#infrastructure/crawler/crawler-dispatcher.js';
import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { config } from '#infrastructure/config/env.js';

async function main() {
  const [url, filePath] = process.argv.slice(2);

  if (!url || !filePath) {
    console.log('Usage: npx tsx scripts/extract-local.ts <URL> <FILE_PATH>');
    process.exit(1);
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const html = fs.readFileSync(absolutePath, 'utf-8');
  
  const captchaSolver = new CapsolverAdapter(config.capsolverApiKey || '');
  const proxyProvider = new ZyteProxyAdapter(config.zyteApiKey || '');
  const crawler = new CrawlerDispatcher(captchaSolver, proxyProvider);
  const registry = new SourceRegistry(crawler);
  const adapter = await registry.resolve(url);

  console.log(`\n--- Extraction Result for: ${url} ---`);
  console.log(`Using adapter: ${adapter.constructor.name}`);
  console.log(`Source file: ${absolutePath}\n`);

  try {
    const result = await adapter.extract(url, { html });
    console.log(JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('Extraction failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
