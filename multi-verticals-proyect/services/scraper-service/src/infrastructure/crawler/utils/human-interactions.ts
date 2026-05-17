/// <reference lib="dom" />
import type { Page } from 'playwright-core';

import { logger } from '@allcoba/kernel';

export interface HumanInteractionOptions {
  headless?: boolean;
  timeout?: number;
}

/**
 * Espera un tiempo aleatorio entre min y max ms.
 */
export async function randomWait(min: number, max: number): Promise<void> {
  const wait = Math.floor(Math.random() * (max - min + 1) + min);
  await new Promise((resolve) => setTimeout(resolve, wait));
}

/**
 * Simula el movimiento del ratón de forma humana (curvas y velocidad variable).
 */
export async function simulateHumanMouse(
  page: Page,
  targetX: number,
  targetY: number,
): Promise<void> {
  const steps = Math.floor(Math.random() * 15) + 15; // Entre 15 y 30 pasos

  // Obtenemos posición actual o empezamos en un punto aleatorio
  const startX = Math.random() * 100;
  const startY = Math.random() * 100;

  for (let i = 1; i <= steps; i++) {
    const progress = i / steps;
    // Añadimos un poco de "ruido" y curvas (easing)
    const easing = 1 - Math.pow(1 - progress, 3);
    const currentX = startX + (targetX - startX) * easing + (Math.random() * 2 - 1);
    const currentY = startY + (targetY - startY) * easing + (Math.random() * 2 - 1);

    await page.mouse.move(currentX, currentY);
    if (i % 5 === 0) await randomWait(10, 30);
  }
}

/**
 * Intenta localizar y hacer clic en el widget de Turnstile.
 */
export async function clickTurnstileWidget(page: Page): Promise<boolean> {
  try {
    let box: { x: number; y: number; width: number; height: number } | null = null;

    // Opción A: input de respuesta
    const widgetInput = await page.$('input[name="cf-turnstile-response"]');
    if (widgetInput) {
      box = await widgetInput.evaluate((el) => {
        const container = el.parentElement?.parentElement?.parentElement;
        if (!container) return null;
        const rect = container.getBoundingClientRect();
        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      });
    }

    // Opción B: iframe de Cloudflare
    if (!box || box.width === 0) {
      for (const frame of page.frames()) {
        if (frame.url().includes('challenges.cloudflare.com')) {
          const el = await frame.frameElement();
          box = await el.boundingBox();
          if (box && box.width > 0) break;
        }
      }
    }

    if (box && box.width > 0 && box.height > 0) {
      const targetX = box.x + box.width / 2;
      const targetY = box.y + box.height / 2;

      await simulateHumanMouse(page, targetX, targetY);

      await page.mouse.down();
      await randomWait(50, 150);
      await page.mouse.up();
      logger().info('Clic automático (movimiento humano) en Cloudflare realizado.');
      return true;
    }

    logger().info('No se encontró widget de Cloudflare con dimensiones válidas.');
    return false;
  } catch (e) {
    logger().info(
      `Error al intentar clic en Cloudflare: ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
}

/**
 * Espera a que desaparezcan los indicadores de Cloudflare del DOM.
 */
export async function waitForCloudflareClear(page: Page, timeout: number): Promise<boolean> {
  try {
    await page.waitForFunction(
      () => {
        const title = document.title;
        const challenge = document.querySelector('#challenge-running');
        const bodyText = document.body.innerText;
        return (
          !title.includes('Un momento') &&
          !title.includes('Just a moment') &&
          !challenge &&
          !bodyText.includes('Verify you are human')
        );
      },
      { timeout },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Orquestador completo para detectar y resolver Cloudflare.
 */
export async function handleCloudflareChallenge(
  page: Page,
  options: HumanInteractionOptions = {},
): Promise<void> {
  const content = await page.content();
  const hasCF =
    content.includes('challenges.cloudflare.com') ||
    content.includes('Un momento…') ||
    content.includes('Just a moment...') ||
    content.includes('Verify you are human');

  if (!hasCF) return;

  logger().warn('Cloudflare detectado. Intentando interacción automática...');
  await clickTurnstileWidget(page);

  const resolved = await waitForCloudflareClear(page, 20000);
  if (resolved) {
    logger().info('Cloudflare resuelto automáticamente. Continuando...');
    return;
  }

  if (options.headless) {
    const msg = 'Cloudflare no se resolvió automáticamente en modo Headless. Abortando.';
    logger().error(msg);
    throw new Error(msg);
  }

  logger().warn('Cloudflare requiere resolución manual. Esperando 60s extra...');
  const resolvedManual = await waitForCloudflareClear(page, 60000);
  if (!resolvedManual) {
    throw new Error('Cloudflare no se resolvió a tiempo (manual).');
  }
  logger().info('Cloudflare resuelto manualmente. Continuando...');
}
