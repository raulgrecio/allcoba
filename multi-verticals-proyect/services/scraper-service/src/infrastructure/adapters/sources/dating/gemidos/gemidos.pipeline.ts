import * as cheerio from 'cheerio';

import type { GemidosPayload } from './gemidos.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractGemidos } from './gemidos.extractor.js';
import { mapGemidos } from './gemidos.mapper.js';

// Secciones de gemidos.tv que comparten el patrón /{slug} pero no son perfiles
const NON_PROFILE_SLUGS = new Set([
  'escorts', 'escorts-gay', 'escorts-trans', 'gigolos', 'parejas',
  'aviso-legal', 'politica-de-cookies', 'politicas-de-privacidad',
  'ayuda-y-contacto', 'registrate', 'login', 'espana',
]);

const COOKIE_SELECTORS = [
  '#onetrust-accept-btn-handler',
  'button[class*="accept"]',
  '.cc-accept',
  '#cn-accept-cookie',
  '.cookie-notice-accept',
  '#cookie-notice-accept',
];

const AGE_GATE_SELECTORS = ['#age-gate-modal button', '.btn-age-gate', 'button:contains("18")'];

export class GemidosPipeline extends DatingPipelineBase<GemidosPayload> {
  readonly identifier = 'gemidos';

  canHandle(url: string): boolean {
    return url.includes('gemidos.tv');
  }

  isProfileUrl(url: string): boolean {
    // Profile: /{slug} de un solo segmento (con o sin id numérico final).
    // Ej: /anitta-brasil, /pau-535603. Se excluyen las secciones conocidas
    // y las rutas multi-segmento (regiones tipo /espana-comunidad-de-madrid).
    const path = new URL(url).pathname.replace(/\/$/, '');
    const parts = path.split('/').filter(Boolean);
    if (parts.length !== 1) return false;
    const slug = parts[0]!;
    return !NON_PROFILE_SLUGS.has(slug) && !slug.startsWith('espana');
  }

  /** Discovery preciso: solo anchors de las cards del listado. */
  override extractProfileLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const links = new Set<string>();
    $('.listing-pub a.listing-link[href], a.listing-link[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      try {
        const abs = new URL(href, baseUrl).toString();
        if (this.canHandle(abs)) links.add(abs);
      } catch {
        /* href inválido */
      }
    });
    return [...links];
  }

  extract(html: string, sourceUrl: string): GemidosPayload {
    return extractGemidos(html, sourceUrl);
  }

  map = mapGemidos;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }
}
