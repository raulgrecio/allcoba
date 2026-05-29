import type { Page } from 'playwright-core';

import { logger } from '@allcoba/kernel';

import type { CaptchaSolver } from '#application/ports/captcha-solver.port.js';

import { extractTurnstileKey, injectTurnstileToken } from '../../crawler/utils/captcha-utils.js';

export class CapsolverAdapter implements CaptchaSolver {
  private readonly apiUrl = 'https://api.capsolver.com';

  constructor(private readonly apiKey: string) {}

  async solve(page: Page): Promise<boolean> {
    if (!this.apiKey) {
      logger().warn('CapSolver API Key no configurada, saltando resolución');
      return false;
    }

    const url = page.url();

    try {
      logger().info('Buscando SiteKey de Turnstile...');
      const siteKey = await extractTurnstileKey(page);

      if (!siteKey) {
        logger().warn('No se pudo encontrar el SiteKey de Turnstile en la página.');
        return false;
      }

      logger().info({ siteKey }, 'SiteKey encontrado. Solicitando solución a CapSolver...');

      const createTaskRes = await fetch(`${this.apiUrl}/createTask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientKey: this.apiKey,
          task: {
            type: 'AntiTurnstileTaskProxyLess',
            websiteURL: url,
            websiteKey: siteKey,
          },
        }),
      });

      const taskData = await createTaskRes.json();
      if (taskData.errorId > 0) {
        throw new Error(`Error en CapSolver createTask: ${taskData.errorDescription}`);
      }

      const taskId = taskData.taskId;
      logger().info({ taskId }, 'Tarea creada. Esperando solución...');

      let solution = '';
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));

        const getResultRes = await fetch(`${this.apiUrl}/getTaskResult`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientKey: this.apiKey, taskId }),
        });

        const resultData = await getResultRes.json();
        if (resultData.status === 'ready') {
          solution = resultData.solution.token;
          break;
        }
        if (resultData.status === 'failed') {
          throw new Error('CapSolver reportó fallo en la resolución.');
        }
      }

      if (!solution) throw new Error('Timeout esperando solución de CapSolver.');

      logger().info('¡Solución obtenida! Inyectando token en la página...');
      await injectTurnstileToken(page, solution);

      logger().info('Token inyectado. Esperando a que Cloudflare nos deje pasar...');
      return true;
    } catch (error) {
      logger().error(
        `Error en CapsolverAdapter: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
  }
}
