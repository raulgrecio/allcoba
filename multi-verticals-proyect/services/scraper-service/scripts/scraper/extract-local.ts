import fs from 'node:fs';
import path from 'node:path';

import { isDatingPipelinePort } from '#application/ports/dating-pipeline.port.js';
import { isScrapingPipelinePort } from '#application/ports/scraping-pipeline.port.js';
import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { NullTaxonomyResolver } from '#infrastructure/adapters/catalog/null-taxonomy-resolver.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { SourceRegistry } from '#infrastructure/adapters/sources/source.registry.js';
import { config } from '#infrastructure/config/env.js';
import { CrawlerDispatcher } from '#infrastructure/crawler/crawler-dispatcher.js';

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
    if (isDatingPipelinePort(adapter) || isScrapingPipelinePort(adapter)) {
      const payload = adapter.extract(html, url);
      const scraped = await adapter.map(payload, new NullTaxonomyResolver());
      console.log(JSON.stringify(scraped, null, 2));
    } else {
      const result = await adapter.extract(url, { html });
      console.log(JSON.stringify(result.data, null, 2));
    }
  } catch (error) {
    console.error('Extraction failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
