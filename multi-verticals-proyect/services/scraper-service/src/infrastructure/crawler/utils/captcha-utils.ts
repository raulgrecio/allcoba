/// <reference lib="dom" />
import type { Page } from 'playwright-core';

/**
 * Intenta extraer el SiteKey de Cloudflare Turnstile de la página.
 * Busca tanto en el contenedor oficial como en los iframes de Cloudflare.
 */
export async function extractTurnstileKey(page: Page): Promise<string | null> {
  const key = await page.evaluate(() => {
    // 1. Buscar en el div contenedor oficial
    const container = document.querySelector('.cf-turnstile');
    if (container) {
      const key = container.getAttribute('data-sitekey');
      if (key) return key;
    }

    // 2. Buscar en los iframes de Cloudflare (parámetro k en la URL)
    const iframes = Array.from(document.querySelectorAll('iframe'));
    for (const f of iframes) {
      const src = f.getAttribute('src') || '';
      const match = src.match(/k=([^&]+)/);
      if (match) return match[1];
    }

    return null;
  });
  return key ?? null;
}

/**
 * Inyecta el token de solución en la página y dispara los callbacks necesarios.
 */
export async function injectTurnstileToken(page: Page, token: string): Promise<void> {
  await page.evaluate((t) => {
    // 1. Inyectar en el campo oculto de respuesta
    const input = document.querySelector('input[name="cf-turnstile-response"]') as HTMLInputElement;
    if (input) {
      input.value = t;
    }

    // 2. Intentar ejecutar el callback de éxito
    // El widget suele definirlo en data-callback o usar uno por defecto
    const cfContainer = document.querySelector('.cf-turnstile');
    const callbackName = cfContainer?.getAttribute('data-callback');

    if (callbackName && (window as any)[callbackName]) {
      (window as any)[callbackName](t);
    } else if ((window as any).cfCallback) {
      (window as any).cfCallback(t);
    }
  }, token);
}
