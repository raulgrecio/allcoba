import { logger } from '@allcoba/kernel';

/**
 * CrawlerLifecycle — encapsula el navegador activo y su cierre ordenado.
 *
 * Los comandos `scrape` / `discover` registran su crawler aquí; el cierre se
 * dispara al terminar el comando o por señal SIGTERM/SIGINT.
 */
export class CrawlerLifecycle {
  private active: { close(): Promise<void> } | undefined;

  constructor() {
    process.on('SIGTERM', () => void this.shutdown());
    process.on('SIGINT', () => void this.shutdown());
  }

  track(crawler: { close(): Promise<void> }): void {
    this.active = crawler;
  }

  async shutdown(): Promise<void> {
    if (this.active) {
      logger().info('Cerrando navegadores...');
      await this.active.close().catch(() => {});
      this.active = undefined;
    }
  }
}
