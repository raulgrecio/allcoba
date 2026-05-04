import { chromium } from "playwright";
import type { Browser, Page, BrowserContext } from "playwright";
import { logger } from "@allcoba/kernel";

export interface PlaywrightOptions {
  timeout?: number;
  waitUntil?: "load" | "domcontentloaded" | "networkidle";
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
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2.1 Safari/605.1.15",
];

export class PlaywrightCrawler {
  private browser: Browser | null = null;

  async init(options: PlaywrightOptions = {}) {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: options.headless ?? false,
        args: [
          "--disable-blink-features=AutomationControlled",
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-infobars",
          "--window-position=0,0",
          "--ignore-certifcate-errors",
          "--ignore-certifcate-errors-spki-list",
        ],
      });
    }
  }

  async fetch(url: string, options: PlaywrightOptions = {}): Promise<string> {
    await this.init(options);

    const userAgent =
      options.userAgent ||
      USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    const context: BrowserContext = await this.browser!.newContext({
      userAgent,
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      locale: "es-ES",
      timezoneId: "Europe/Madrid",
      permissions: ["geolocation"],
      extraHTTPHeaders: {
        "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        "Upgrade-Insecure-Requests": "1",
      },
    });

    // 0. Scripts de sigilo avanzados
    const page: Page = await context.newPage();
    await this.applyStealth(page);

    const timeout = options.timeout || 30000;

    try {
      logger().info({ url }, "Iniciando navegación camuflada");

      // 1. Navegación en dos pasos (Home -> Referer -> Ad)
      const { origin } = new URL(url);
      await page.goto(origin, {
        waitUntil: "domcontentloaded",
        timeout: 15000,
      });
      await page.waitForTimeout(1000 + Math.random() * 2000);

      // 2. Gestionar Cookies
      await this.handleCookies(page, options.cookieSelectors || []);

      // 3. Ir al destino real
      logger().info({ url }, "Navegando al destino final");
      await page.goto(url, {
        timeout,
        waitUntil: options.waitUntil || "load",
        referer: origin,
      });

      // 4. Scroll humano
      await this.simulateHumanScroll(page);

      // 5. Hook de interacción (¡Aquí es donde hacemos magia!)
      if (options.onBeforeCapture) {
        logger().info("Ejecutando acciones pre-captura...");
        await options.onBeforeCapture(page);
        // Esperamos un poco tras la interacción por si se carga contenido nuevo
        await page.waitForTimeout(1000);
      }

      const content = await page.content();
      logger().info("HTML capturado con éxito");

      return content;
    } catch (error: any) {
      logger().error(
        { error: error.message, url },
        "Fallo en PlaywrightCrawler",
      );
      throw error;
    } finally {
      // Mantenemos abierto en dev para debug, cerrar en producción
      if (options.headless) {
        await context.close();
      }
    }
  }

  private async applyStealth(page: Page) {
    await page.addInitScript(() => {
      // 1. Borrar rastro de WebDriver
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });

      // 2. Simular lenguajes
      Object.defineProperty(navigator, "languages", {
        get: () => ["es-ES", "es", "en"],
      });

      // 3. Simular Plugins
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });

      // 4. Mock de Chrome runtime
      (window as any).chrome = { runtime: {} };
    });
  }

  private async handleCookies(page: Page, customSelectors: string[]) {
    const genericSelectors = [
      "#didomi-notice-agree-button", // Fotocasa / Portales conocidos
      "#onetrust-accept-btn-handler", // Estándar OneTrust
      ".cookie-banner__accept",
      '[aria-label="Aceptar todas"]',
      'button:has-text("Aceptar")',
      'button:has-text("SÍ, ACEPTO")',
    ];

    const allSelectors = [...customSelectors, ...genericSelectors];

    for (const selector of allSelectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 2000 })) {
          logger().info(
            { selector },
            "Banner de cookies detectado, aceptando...",
          );
          await btn.click();
          await page.waitForTimeout(500);
          return;
        }
      } catch (e) {
        // Ignorar si no se encuentra
      }
    }
  }

  private async simulateHumanScroll(page: Page) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight || totalHeight > 1000) {
            clearInterval(timer);
            resolve(true);
          }
        }, 100);
      });
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
