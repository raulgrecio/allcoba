import fastify from 'fastify';

import { logger } from '@allcoba/kernel';

import { Container } from './di/container.js';
import { config } from './infrastructure/config/env.js';
import { mediaRoutes } from './infrastructure/http/media.routes.js';

async function main() {
  // Natively load .env file in Node 20.12+
  try {
    process.loadEnvFile();
  } catch {
    // Silent catch if .env is missing
  }

  const log = logger().child({ component: 'MediaServiceMain' });

  log.info('Initializing media-service...');

  const server = fastify({
    logger: false, // Usar logger centralizado pino de kernel en lugar del de Fastify
    bodyLimit: 20 * 1024 * 1024, // 20MB limit for base64 image payloads
  });

  // Health check endpoint
  server.get('/health', async () => {
    return { status: 'OK', service: 'media-service' };
  });

  // Register media routes
  await server.register(mediaRoutes);

  // Initialize and start queue consumer if enabled (Phase 2)
  const container = Container.getInstance();
  await container.startQueue();

  const port = config.port;
  const host = '0.0.0.0';

  try {
    const address = await server.listen({ port, host });
    log.info(`media-service listening on ${address}`);
  } catch (err) {
    log.error({ err }, 'Failed to start media-service');
    process.exit(1);
  }

  // Graceful shutdown
  const shutdown = async () => {
    log.info('Stopping media-service server...');
    await container.stopQueue();
    await server.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger().error({ err }, 'Fatal error starting media-service');
  process.exit(1);
});
