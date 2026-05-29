import { Command } from 'commander';

import { logger } from '@allcoba/kernel';

import { registerDiscoverCommand } from '#infrastructure/cli/commands/discover.command.js';
import { registerScrapeCommand } from '#infrastructure/cli/commands/scrape.command.js';
import { registerStatsCommand } from '#infrastructure/cli/commands/stats.command.js';
import { CrawlerLifecycle } from '#infrastructure/cli/crawler-lifecycle.js';

async function main() {
  logger().info('Iniciando scraper-service...');

  const program = new Command();
  program.name('scraper').description('Herramientas de scraping multi-vertical').version('1.0.0');

  const lifecycle = new CrawlerLifecycle();
  registerScrapeCommand(program, lifecycle);
  registerDiscoverCommand(program, lifecycle);
  registerStatsCommand(program);

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  logger().error(
    { msg: error.message, stack: error.stack, name: error.name },
    'Error fatal en el servicio',
  );
  process.exit(1);
});
