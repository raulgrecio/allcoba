/**
 * parseNextData — extrae el objeto __NEXT_DATA__ de páginas Next.js (App Router y Pages).
 *
 * En Pages Router:  <script id="__NEXT_DATA__" type="application/json">{...}</script>
 * En App Router:    self.__next_f.push([1, '...']) — no parseado aquí (diferente formato).
 *
 * Devuelve el JSON parseado o null si no existe / es inválido.
 */

import * as cheerio from 'cheerio';

export function parseNextData(html: string): Record<string, unknown> | null {
  const $ = cheerio.load(html);
  const raw = $('script#__NEXT_DATA__[type="application/json"]').first().html();
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}
