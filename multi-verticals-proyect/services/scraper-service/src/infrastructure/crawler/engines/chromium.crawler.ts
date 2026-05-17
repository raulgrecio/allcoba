import * as path from 'node:path';

import { logger } from '@allcoba/kernel';

import type { CaptchaSolver } from '#application/ports/captcha-solver.port.js';
import type { CrawlerOptions, CrawlResult } from '#application/ports/crawler.port.js';
import type { ProxyProvider } from '#application/ports/proxy-provider.port.js';
import { CrawlerEngine, ProxyStrategy } from '#application/ports/crawler.port.js';

import { BaseCrawler } from './base.crawler.js';

/**
 * Interface estructural para aceptar motores compatibles con Playwright (como Patchright)
 */
interface ChromiumEngine {
  name(): string;
  launch(options?: any): Promise<any>;
  launchPersistentContext(userDataDir: string, options?: any): Promise<any>;
}

export class ChromiumCrawler extends BaseCrawler {
  private browser: any | null = null;

  constructor(
    private readonly engine: ChromiumEngine,
    private readonly engineType: CrawlerEngine,
    captchaSolver: CaptchaSolver,
    proxyProvider: ProxyProvider,
    maxConcurrent: number = 3,
  ) {
    super(captchaSolver, proxyProvider, maxConcurrent);
  }

  async fetch(url: string, options: CrawlerOptions = {}): Promise<CrawlResult> {
    await this.semaphore.acquire();
    const proxyConfig =
      options.proxyStrategy && options.proxyStrategy !== ProxyStrategy.NONE
        ? this.proxyProvider.getConfig(options.proxyStrategy)
        : undefined;
    let context: any;
    let isPersistent = false;
    const isHeadless = options.headless !== false;

    const contextOptions = {
      viewport: isHeadless ? undefined : this.getRandomViewport(),
      userAgent: this.engineType !== CrawlerEngine.PATCHRIGHT ? this.getRandomUA() : undefined,
      proxy: proxyConfig,
      ignoreHTTPSErrors: true,
    };

    try {
      if (options.sessionProfile) {
        const profilePath = path.join(BaseCrawler.PROFILES_DIR, options.sessionProfile);
        if (!this.domainContexts.has(options.sessionProfile)) {
          logger().info(
            { profilePath },
            `Usando perfil de sesión persistente (${this.engine.name()})`,
          );
          context = await this.engine.launchPersistentContext(profilePath, {
            ...contextOptions,
            headless: isHeadless,
            args: ['--no-sandbox'],
          });
          this.domainContexts.set(options.sessionProfile, context);
        } else {
          context = this.domainContexts.get(options.sessionProfile);
        }
        isPersistent = true;
      }

      if (!context) {
        if (!this.browser) {
          this.browser = await this.engine.launch({
            headless: isHeadless,
            args: ['--no-sandbox'],
          });
        }
        context = await this.browser.newContext(contextOptions);
      }

      const page = await context.newPage();

      // Bloqueo de imágenes para ahorrar ancho de banda
      if (options.blockImages) {
        await page.route('**/*.{png,jpg,jpeg,gif,webp,svg}', (route: any) => route.abort());
      }

      // Captura de red si se solicita
      const networkResponses: any[] = [];
      if (options.captureNetwork) {
        page.on('response', async (response: any) => {
          try {
            const respUrl = response.url();
            if (options.trafficBlacklist?.some((b: string) => respUrl.includes(b))) return;
            const status = response.status();
            const contentType = response.headers()['content-type'] || '';
            if (
              contentType.includes('json') ||
              contentType.includes('javascript') ||
              respUrl.includes('api')
            ) {
              const body = await response.text().catch(() => '');
              networkResponses.push({ url: respUrl, status, body, contentType });
            }
          } catch {
            /* ignore */
          }
        });
      }

      logger().info({ url }, `Iniciando navegación (${this.engine.name()})`);
      const response = await page.goto(url, {
        timeout: options.timeout || 60000,
        waitUntil: options.waitUntil || 'domcontentloaded',
      });

      if (options.onSnapshot) {
        await options.onSnapshot(await page.content(), 'after_goto');
      }

      // Gestión de seguridad unificada (Cloudflare, CapSolver, etc.)
      await this.handleSecurity(page, options);

      // Gestión de cookies
      await this.handleCookies(page, options.cookieSelectors);

      if (options.onSnapshot) {
        await options.onSnapshot(await page.content(), 'after_security');
      }

      if (options.onBeforeCapture) {
        await options.onBeforeCapture(page);
      }

      const html = await page.content();

      // Detectar errores comunes de proxies (Zyte, etc.)
      if (
        options.proxyStrategy === ProxyStrategy.PROXY &&
        (html.includes('All download attempts failed') || html.includes('Zyte Smart Proxy Error'))
      ) {
        throw new Error(
          'Proxy failed to download the page: ' +
            (html.length < 500 ? html : 'Error message detected in HTML'),
        );
      }

      const status = response?.status() || 200;
      const serverIp = (await response?.serverAddr())?.ipAddress;
      const outboundIp = await this.resolveOutboundIp();
      const userAgent = await page.evaluate(() => navigator.userAgent);

      if (!isPersistent) await context.close();
      else await page.close();

      return {
        html,
        status,
        userAgent,
        serverIp,
        outboundIp,
        networkResponses,
      };
    } finally {
      this.semaphore.release();
    }
  }

  async close() {
    for (const ctx of this.domainContexts.values()) {
      await ctx.close().catch(() => {});
    }
    this.domainContexts.clear();
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
