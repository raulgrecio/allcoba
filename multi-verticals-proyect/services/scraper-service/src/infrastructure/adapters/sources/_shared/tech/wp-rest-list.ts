/**
 * wpRestList — parsea la respuesta JSON de la WP REST API.
 *
 * El crawler devuelve el JSON de /wp-json/wp/v2/{cpt}?per_page=N dentro de
 * una etiqueta <pre> (Chrome renderiza JSON sin formato) o como texto plano.
 * Devuelve el array de ítems o [] si el cuerpo no es JSON válido.
 */

import * as cheerio from 'cheerio';

export function wpRestList(html: string): unknown[] {
  const $ = cheerio.load(html);
  const raw = $('pre').text().trim() || $('body').text().trim() || html.trim();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch {
    return [];
  }
}

/** Extrae los campos `link` de una respuesta WP REST. */
export function wpRestLinks(html: string): string[] {
  return wpRestList(html)
    .map((item) =>
      item && typeof item === 'object' ? (item as Record<string, unknown>).link : undefined,
    )
    .filter((l): l is string => typeof l === 'string' && l.length > 0);
}
