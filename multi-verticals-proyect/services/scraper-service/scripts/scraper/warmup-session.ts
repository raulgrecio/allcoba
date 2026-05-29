import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'patchright';

async function main() {
  const url = 'https://www.eurogirlsescort.com/';
  const profilePath = path.join(process.cwd(), '__data/profiles/eurogirlsescort');

  if (!fs.existsSync(profilePath)) {
    fs.mkdirSync(profilePath, { recursive: true });
  }

  console.log('\n=== FASE 1: Calentamiento de Sesión (Manual) ===');
  console.log('1. Se va a abrir el navegador.');
  console.log('2. Navega un poco, acepta las cookies, resuelve el Cloudflare si sale.');
  console.log('3. CUANDO TERMINES, CIERRA EL NAVEGADOR MANUALMENTE o pulsa Ctrl+C en la consola.');

  const context = await chromium.launchPersistentContext(profilePath, {
    headless: false,
    args: ['--start-maximized'],
  });

  const page = await context.newPage();

  try {
    await page.goto(url);

    // Mantenemos abierto hasta que el usuario decida (60 segundos de margen)
    await new Promise((r) => setTimeout(r, 120000));
  } catch (err: unknown) {
    console.log(`Finalizado o error: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await context.close();
    console.log(`✅ Sesión guardada en: ${profilePath}`);
  }
}

main();
