import { logger } from '@allcoba/kernel';

import { ScrapeUrlUseCase } from './application/use-cases/scrape-url.use-case.js';
import { ConsolidationService } from './domain/services/consolidation.service.js';
import { SharpHasherAdapter } from './infrastructure/adapters/images/sharp-hasher.adapter.js';
import { JsonFileProviderRepository } from './infrastructure/adapters/persistence/json-file-provider.repository.js';
import { FotocasaAdapter } from './infrastructure/adapters/sources/real-estate/fotocasa.adapter.js';
import { IdealistaAdapter } from './infrastructure/adapters/sources/real-estate/idealista.adapter.js';
import { LocalStorageAdapter } from './infrastructure/adapters/storage/local-storage.adapter.js';

async function main() {
  logger().info('Iniciando scraper-service...');

  // 1. Inicializar dependencias
  const repository = new JsonFileProviderRepository();
  const consolidationService = new ConsolidationService();
  const imageHasher = new SharpHasherAdapter();
  const storage = new LocalStorageAdapter();

  // Adaptadores organizados por su nueva ruta
  const sources = [new IdealistaAdapter(), new FotocasaAdapter()];

  const scrapeUrlUseCase = new ScrapeUrlUseCase(
    sources,
    repository,
    consolidationService,
    imageHasher,
    storage,
    { maxImagesToProcess: 5, saveRawHtml: true, headless: false },
  );

  // 2. Procesar argumentos de CLI
  const urlArg = process.argv.find((arg: string) => arg.startsWith('--url='));
  if (urlArg) {
    const url = urlArg.split('=')[1];
    if (url) {
      logger().info({ url }, 'Procesando URL desde CLI');
      await scrapeUrlUseCase.execute(url);
    }
  }

  logger().info('Proceso completado con éxito');
}

main().catch((error) => {
  logger().error(
    {
      msg: error.message,
      stack: error.stack,
      name: error.name,
    },
    'Error fatal en el servicio',
  );
  process.exit(1);
});
