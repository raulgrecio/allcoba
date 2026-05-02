import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';
import { logger } from '@allcoba/kernel';

export interface PlaywrightOptions {
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  userAgent?: string;
  headless?: boolean;
}

export class PlaywrightCrawler {
  private browser: Browser | null = null;

  async init() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: false, // Cambiamos a false para que veas qué pasa
        args: ['--disable-blink-features=AutomationControlled'] // Ocultar que es un bot
      });
    }
  }

  async fetch(url: string, options: PlaywrightOptions = {}): Promise<string> {
    await this.init();
    const context = await this.browser!.newContext({
      userAgent: options.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
      deviceScaleFactor: 1,
      locale: 'es-ES',
      extraHTTPHeaders: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'document',
        'sec-fetch-mode': 'navigate',
        'sec-fetch-site': 'none',
        'sec-fetch-user': '?1',
        'upgrade-insecure-requests': '1',
      }
    });
    
    const page: Page = await context.newPage();
    
    // 0. Script de sigilo para borrar huellas de automatización
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const timeout = options.timeout || 30000;

    try {
      logger().info({ url }, 'Abriendo página con navegación de camuflaje');
      
      // 1. Ir a la home con un referer de Google
      const { origin } = new URL(url);
      await page.goto(origin, { 
        waitUntil: 'networkidle', 
        timeout: 30000,
        referer: 'https://www.google.com/' 
      });
      await page.waitForTimeout(2000 + Math.random() * 2000);

      // 1.5. Aceptar Cookies si aparece el banner
      try {
        const cookieButton = page.locator('#didomi-notice-agree-button');
        if (await cookieButton.isVisible({ timeout: 5000 })) {
          logger().info('Banner de cookies detectado, aceptando...');
          await cookieButton.click();
          await page.waitForTimeout(1000 + Math.random() * 1000);
        }
      } catch (e) {
        logger().info('No se detectó banner de cookies o ya estaba aceptado');
      }

      // 2. Ir al anuncio real con el referer de la home
      logger().info({ url }, 'Navegando al anuncio...');
      await page.goto(url, {
        timeout,
        waitUntil: 'load',
        referer: origin
      });

      // 4. Scroll suave para simular lectura
      await page.evaluate(() => window.scrollBy(0, 400));
      await page.waitForTimeout(2000 + Math.random() * 2000);

      const content = await page.content();
      
      // ESPERAR PARA QUE PUEDAS VER LA VENTANA (No se cerrará)
      logger().info('Extracción terminada. Manteniendo ventana abierta para inspección...');
      await page.waitForTimeout(3600000); // 1 hora de espera

      return content;
    } catch (error: any) {
      logger().error({ 
        error: { message: error.message, stack: error.stack }, 
        url 
      }, 'Error en PlaywrightCrawler');
      throw error;
    } finally {
      // COMENTADO PARA QUE NO SE CIERRE
      // await page.close();
      // await context.close();
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
