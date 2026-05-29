/**
 * detectTech — identifica el stack tecnológico de una página scrapeada.
 *
 * Usado en DATING-SOURCES.md y en tests de diagnóstico.
 * No hace IO — solo inspecciona el HTML y la URL.
 */

import * as cheerio from 'cheerio';

export interface DetectedTech {
  wordpress: boolean;
  nextjs: boolean;
  astro: boolean;
  cloudflare: boolean;
  wpVersion: string | null;
}

export function detectTech(html: string, url?: string): DetectedTech {
  const $ = cheerio.load(html);
  const body = html;

  const wordpress =
    body.includes('/wp-content/') ||
    body.includes('/wp-includes/') ||
    $('meta[name="generator"]').attr('content')?.toLowerCase().includes('wordpress') === true;

  const wpVersionMeta = $('meta[name="generator"]').attr('content') ?? '';
  const wpVersionMatch = wpVersionMeta.match(/WordPress\s+([\d.]+)/i);
  const wpVersion = wpVersionMatch ? (wpVersionMatch[1] ?? null) : null;

  const nextjs =
    $('script#__NEXT_DATA__').length > 0 ||
    body.includes('self.__next_f') ||
    body.includes('/_next/static/');

  const astro =
    body.includes('astro-island') ||
    $('script[type="module"][src*="/_astro/"]').length > 0 ||
    body.includes('@astrojs');

  const cloudflare =
    body.includes('cf-browser-verification') ||
    body.includes('cf_chl_') ||
    body.includes('__cf_bm') ||
    (url ? url.includes('cloudflare') : false);

  return { wordpress, nextjs, astro, cloudflare, wpVersion };
}
