import { chromium } from 'playwright-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import type { Browser, BrowserContext, Page } from 'playwright';

import { logger } from '@allcoba/kernel';

// Activar el modo sigilo globalmente
chromium.use(stealth());

export interface PlaywrightOptions {
  timeout?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  userAgent?: string;
  headless?: boolean;
  /**
   * Selectores específicos de cookies para este portal
   */
  cookieSelectors?: string[];
  /**
   * Hook para realizar acciones antes de capturar el HTML (ej: clics)
   */
  onBeforeCapture?: (page: Page) => Promise<void>;
  /**
   * Callback para capturar instantáneas del HTML en diferentes etapas
   */
  onSnapshot?: (html: string, stage: string) => Promise<void>;
}

export interface CrawlResult {
  html: string;
  userAgent: string;
  serverIp?: string;
  outboundIp?: string;
  status: number;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
];

const VIEWPORTS = [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
];

export class PlaywrightCrawler {
  private browser: Browser | null = null;

  async init(options: PlaywrightOptions = {}) {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: options.headless ?? true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
        ],
      });
    }
  }

  async fetch(url: string, options: PlaywrightOptions = {}): Promise<CrawlResult> {
    await this.init(options);

    const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    const randomViewport = VIEWPORTS[Math.floor(Math.random() * VIEWPORTS.length)];

    // 0. Crear contexto limpio con identidad aleatoria
    const context: BrowserContext = await this.browser!.newContext({
      viewport: randomViewport,
      userAgent: options.userAgent || randomUA,
      deviceScaleFactor: 1,
      locale: 'es-ES',
      timezoneId: 'Europe/Madrid',
      permissions: ['geolocation'],
    });

    const page: Page = await context.newPage();
    const timeout = options.timeout || 30000;

    try {
      logger().info({ url }, 'Iniciando navegación camuflada');

      // 1. Navegación en dos pasos (Home -> Referer -> Ad)
      const { origin } = new URL(url);
      await page.goto(origin, {
        waitUntil: 'domcontentloaded',
        timeout: 15000,
      });

      // Snapshot INICIAL (nada más entrar)
      if (options.onSnapshot) {
        await options.onSnapshot(await page.content(), 'initial');
      }

      await this.randomWait(1000, 3000);

      // 2. Gestionar Cookies
      await this.handleCookies(page, options.cookieSelectors || []);

      // Snapshot tras COOKIES
      if (options.onSnapshot) {
        await options.onSnapshot(await page.content(), 'after_cookies');
      }

      // 3. Ir al destino real
      logger().info({ url }, 'Navegando al destino final');
      const response = await page.goto(url, {
        timeout,
        waitUntil: options.waitUntil || 'load',
        referer: origin,
      });

      const serverAddr = await response?.serverAddr();
      const status = response?.status() || 0;

      // 4. Scroll humano
      await this.simulateHumanScroll(page);

      // 5. Hook de interacción
      if (options.onBeforeCapture) {
        logger().info('Ejecutando acciones pre-captura...');
        await options.onBeforeCapture(page);
        await this.randomWait(1000, 2000);
      }

      const content = await page.content();
      logger().info('HTML capturado con éxito');

      // Obtener nuestra IP de salida (desde Node.js para evitar bloqueos de CSP)
      let outboundIp: string | undefined;
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json');
        const ipData = (await ipRes.json()) as any;
        outboundIp = ipData.ip;
      } catch (e) {
        logger().warn('No se pudo obtener la IP de salida');
      }

      return {
        html: content,
        userAgent: await page.evaluate(() => navigator.userAgent),
        serverIp: serverAddr?.ipAddress,
        outboundIp,
        status,
      };
    } catch (error: any) {
      logger().error({ error: error.message, url }, 'Fallo en PlaywrightCrawler');
      throw error;
    } finally {
      // Mantenemos abierto en dev para debug, cerrar en producción
      if (options.headless) {
        await context.close();
      }
    }
  }

  private async handleCookies(page: Page, customSelectors: string[]) {
    const genericSelectors = [
      '#didomi-notice-agree-button', // Fotocasa / Portales conocidos
      '#onetrust-accept-btn-handler', // Estándar OneTrust
      '.cookie-banner__accept',
      '[aria-label="Aceptar todas"]',
      'button:has-text("Aceptar")',
      'button:has-text("SÍ, ACEPTO")',
    ];

    const allSelectors = [...customSelectors, ...genericSelectors];

    for (const selector of allSelectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 2000 })) {
          logger().info({ selector }, 'Banner de cookies detectado, aceptando...');
          await btn.click();
          await this.randomWait(500, 1000);
          return;
        }
      } catch (e) {
        // Ignorar si no se encuentra
      }
    }
  }

  private async simulateHumanScroll(page: Page) {
    await page.evaluate(async () => {
      const doc = (globalThis as any).document;
      const win = (globalThis as any).window;

      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = doc.body.scrollHeight;
          win.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight || totalHeight > 1000) {
            clearInterval(timer);
            resolve(true);
          }
        }, 100);
      });
    });
  }

  /**
   * Espera un tiempo aleatorio entre min y max ms para simular comportamiento humano
   */
  private async randomWait(min: number, max: number): Promise<void> {
    const ms = Math.floor(Math.random() * (max - min + 1) + min);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
