import type { CrawlerOptions } from '#application/ports/crawler.port.js';

import type { Madrid69Payload } from './madrid69.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractMadrid69 } from './madrid69.extractor.js';
import { mapMadrid69 } from './madrid69.mapper.js';

export class Madrid69Pipeline extends DatingPipelineBase<Madrid69Payload> {
  readonly identifier = 'madrid69';

  canHandle(url: string): boolean {
    return /madrid69\.com/.test(url);
  }

  isProfileUrl(url: string): boolean {
    // Profile: /citas-chicas-{city}-{id}-{slug}-{phone} (un solo segmento)
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts.length === 1 && /^citas-chicas-/.test(parts[0]!);
  }

  extract(
    html: string,
    sourceUrl: string,
    networkResponses?: ReadonlyArray<{ url: string; body: string }>,
  ): Madrid69Payload {
    // Enriquecer con el JSON de la API interna (api.madrid69.com) capturado
    // por el crawler — aporta edad, medidas, fotos que no están en el SSR.
    let apiJson: unknown;
    for (const res of networkResponses ?? []) {
      // API interna: api-prod.valenciacitas.com/v3/profiles/{id}
      if (!/valenciacitas\.com\/v3\/profiles\/\d+(?:$|\?)/.test(res.url)) continue;
      try {
        const parsed = JSON.parse(res.body);
        if (parsed && typeof parsed === 'object') {
          apiJson = parsed;
          break;
        }
      } catch {
        /* respuesta no-JSON */
      }
    }
    return extractMadrid69(html, sourceUrl, apiJson);
  }

  map = mapMadrid69;

  /**
   * Home/listado es Next.js CSR: las cards de perfil se renderizan por JS.
   * Forzamos networkidle + espera a que aparezcan los enlaces de perfil
   * (el waitUntil del use-case se sobreescribe colocándolo tras el spread).
   */
  override getCrawlerOptions(url: string, options?: Partial<CrawlerOptions>): CrawlerOptions {
    const isProfile = this.isProfileUrl(url);
    return {
      ...super.getCrawlerOptions(url, options),
      waitUntil: 'networkidle',
      captureNetwork: true,
      onBeforeCapture: async (page) => {
        // Listado: esperar las cards CSR. Perfil: networkidle ya garantiza
        // que la llamada a api.madrid69.com ha terminado.
        if (isProfile) return;
        await page
          .waitForSelector('a[href*="citas-chicas-"]', { timeout: 15000 })
          .catch(() => {});
      },
    };
  }

  override extractNextPageUrl(_html: string, _baseUrl: string): string | undefined {
    // CSR Next.js: pagination via API — needs Playwright endpoint interception.
    return undefined;
  }
}
