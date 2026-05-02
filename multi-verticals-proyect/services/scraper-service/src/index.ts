import 'dotenv/config';
import { logger } from '@allcoba/kernel';
import { ScrapeUrlUseCase } from './application/use-cases/scrape-url.use-case.js';
import { IdealistaAdapter } from './infrastructure/adapters/sources/idealista.adapter.js';
import { InMemoryProviderRepository } from './infrastructure/adapters/persistence/in-memory-provider.repository.js';
import { ConsolidationService } from './domain/services/consolidation.service.js';
import { SharpHasherAdapter } from './infrastructure/adapters/images/sharp-hasher.adapter.js';

async function main() {
  logger().info('Iniciando scraper-service...');

  // 1. Instanciar dependencias (Composición Hexagonal)
  const repository = new InMemoryProviderRepository();
  const consolidationService = new ConsolidationService();
  const imageHasher = new SharpHasherAdapter();
  const sources = [
    new IdealistaAdapter(),
    // Añadir más fuentes aquí
  ];

  const scrapeUrlUseCase = new ScrapeUrlUseCase(sources, repository, consolidationService, imageHasher);

  // 2. Procesar argumentos de CLI (para pruebas manuales)
  const urlArg = process.argv.find((arg: string) => arg.startsWith('--url='));
  if (urlArg) {
    const url = urlArg.split('=')[1];
    logger().info({ url }, 'Procesando URL desde CLI');
    try {
      await scrapeUrlUseCase.execute(url);
      logger().info('Proceso completado con éxito');
    } catch (error: any) {
      logger().error({ 
        error: {
          message: error.message,
          stack: error.stack
        }
      }, 'Error procesando la URL');
    }
    return;
  }

  // 3. TODO: Iniciar suscriptores de cola (pg-boss) para producción
  logger().info('Servicio listo y esperando jobs (modo servidor no implementado aún)');
}

main().catch(error => {
  logger().error({ error }, 'Error fatal en el servicio');
  process.exit(1);
});
