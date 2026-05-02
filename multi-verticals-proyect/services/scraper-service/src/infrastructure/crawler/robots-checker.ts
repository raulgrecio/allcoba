import robotsParser from 'robots-parser';
import { logger } from '@allcoba/kernel';

export class RobotsChecker {
  private cache = new Map<string, any>();

  async isAllowed(url: string, userAgent: string = 'Mozilla/5.0'): Promise<boolean> {
    try {
      const { origin } = new URL(url);
      const robotsUrl = `${origin}/robots.txt`;

      if (!this.cache.has(origin)) {
        const response = await fetch(robotsUrl).catch(() => null);
        const text = response ? await response.text() : '';
        this.cache.set(origin, robotsParser(robotsUrl, text));
      }

      const parser = this.cache.get(origin);
      return parser.isAllowed(url, userAgent) ?? true;
    } catch (error) {
      logger().error({ error, url }, 'Error verificando robots.txt');
      return true; // En caso de duda, permitimos (o podrías ser restrictivo)
    }
  }
}
