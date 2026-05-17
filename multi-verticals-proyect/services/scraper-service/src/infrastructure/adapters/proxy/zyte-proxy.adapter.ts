import { ProxyStrategy } from '#application/ports/crawler.port.js';
import type { ProxyConfig, ProxyProvider } from '#application/ports/proxy-provider.port.js';

export class ZyteProxyAdapter implements ProxyProvider {
  constructor(private readonly apiKey: string) {}

  getConfig(strategy?: string): ProxyConfig | undefined {
    if (!this.apiKey || (strategy && strategy !== ProxyStrategy.PROXY)) {
      return undefined;
    }

    return {
      server: 'http://proxy.zyte.com:8011',
      username: this.apiKey,
      password: '',
    };
  }
}
