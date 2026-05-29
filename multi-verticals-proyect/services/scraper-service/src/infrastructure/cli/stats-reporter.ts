/**
 * stats-reporter — formatea un StatsResult como informe ANSI para terminal.
 *
 * Función pura: recibe el resultado del use case y devuelve un string. Sin IO,
 * sin console.log — así es testeable y el comando solo tiene que imprimirlo.
 */

import type {
  BaselineData,
  StatsResult,
} from '#application/use-cases/extraction-stats.use-case.js';

const C = {
  green: '\x1b[0;32m',
  red: '\x1b[0;31m',
  yellow: '\x1b[1;33m',
  cyan: '\x1b[0;36m',
  bold: '\x1b[1m',
  nc: '\x1b[0m',
} as const;

function fieldMarker(rate: number, base: number | undefined, threshold: number): string {
  if (base === undefined) return '';
  const diff = rate - base;
  if (diff <= -threshold) {
    return `  ${C.red}⚠ baseline ${base}%  REGRESIÓN (${diff.toFixed(1)}pp)${C.nc}`;
  }
  if (diff < 0) return `  ${C.yellow}↓ baseline ${base}% (${diff.toFixed(1)}pp)${C.nc}`;
  if (diff > 0) return `  ${C.green}↑ baseline ${base}%${C.nc}`;
  return '';
}

export function formatStatsReport(
  result: StatsResult,
  baseline: BaselineData | null,
  threshold: number,
): string {
  const lines: string[] = [];

  for (const { source, total, fields } of result.sources) {
    lines.push(`\n${C.bold}${C.cyan}${source}${C.nc}  (${total} perfiles)`);
    const baseFields = baseline?.[source] ?? {};
    for (const [fname, stat] of Object.entries(fields)) {
      const { count, rate } = stat;
      const marker = fieldMarker(rate, baseFields[fname], threshold);
      const color = rate === 0 ? C.red : rate < 50 ? C.yellow : C.green;
      lines.push(
        `  ${fname.padEnd(12)} ${String(count).padStart(3)}/${String(total).padEnd(3)}  ` +
          `${color}${rate.toFixed(1).padStart(5)}%${C.nc}${marker}`,
      );
    }
  }

  if (!baseline) {
    lines.push(`\n${C.yellow}Sin baseline — usa --save-baseline para guardar uno.${C.nc}`);
  } else if (result.regressions.length > 0) {
    lines.push(
      `\n${C.red}⚠ ${result.regressions.length} regresión(es) detectada(s) ` +
        `(umbral: ${threshold}pp)${C.nc}`,
    );
  } else {
    lines.push(
      `\n${C.green}✅ Sin regresiones respecto al baseline (umbral: ${threshold}pp)${C.nc}`,
    );
  }

  return lines.join('\n');
}
