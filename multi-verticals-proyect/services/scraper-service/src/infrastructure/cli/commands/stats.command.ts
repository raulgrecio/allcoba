import fs from 'fs/promises';
import path from 'path';

import type { Command } from 'commander';

import type { Vertical } from '@allcoba/shared-types';
import { logger } from '@allcoba/kernel';

import type { BaselineData } from '#application/use-cases/extraction-stats.use-case.js';
import { createScraperServices } from '#infrastructure/di/container.js';

import { printReport } from '../cli-output.js';
import { formatStatsReport } from '../stats-reporter.js';

interface BaselineFile {
  savedAt: string;
  stats: BaselineData;
}

async function loadBaseline(file: string): Promise<BaselineData | null> {
  try {
    const raw = await fs.readFile(file, 'utf-8');
    return (JSON.parse(raw) as BaselineFile).stats ?? null;
  } catch {
    return null;
  }
}

async function saveBaseline(file: string, stats: BaselineData): Promise<void> {
  const data: BaselineFile = { savedAt: new Date().toISOString(), stats };
  await fs.writeFile(file, JSON.stringify(data, null, 2));
}

/** Registra el subcomando `stats` — fill-rate por portal y detección de regresiones. */
export function registerStatsCommand(program: Command): void {
  program
    .command('stats')
    .description('Fill-rate por portal — detecta regresiones en la extracción')
    .option('--vertical <name>', 'Vertical a analizar (dating, motor, real-estate, general)', 'dating')
    .option('--save-baseline', 'Guardar stats actuales como baseline')
    .option('--threshold <pp>', 'Caída mínima (puntos porcentuales) para alertar (default: 20)', '20')
    .option('--source <name>', 'Filtrar por portal')
    .option('--data-dir <path>', 'Directorio de datos (default: __data/storage)', '__data/storage')
    .action(async (options) => {
      const baselineFile = path.join(
        path.resolve(process.cwd(), options.dataDir as string),
        '..',
        'extraction-baseline.json',
      );
      const threshold = parseInt(options.threshold as string, 10);

      const { statsUseCase } = await createScraperServices({});

      const baseline = await loadBaseline(baselineFile);
      const result = await statsUseCase.execute({
        vertical: options.vertical as Vertical,
        baseline,
        thresholdPp: threshold,
        source: options.source as string | undefined,
      });

      printReport(formatStatsReport(result, baseline, threshold));

      if (options.saveBaseline) {
        await saveBaseline(baselineFile, statsUseCase.toBaselineData(result.sources));
        logger().info({ file: baselineFile }, 'Baseline de extracción guardado');
      }
    });
}
