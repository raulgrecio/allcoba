import fs from 'node:fs';
import path from 'node:path';

// Ruta origen (HTMLs) y destino (JSONs)
const RAW_DIR = './__data/storage/raw/topescortbabes.com';
const TARGET_DIR = '../../../external/temporal/topescortbabes/jsons';

/**
 * Extrae un objeto JSON de una cadena buscando llaves equilibradas.
 */
function extractBalancedJson(str: string): string | null {
  const startPos = str.indexOf('{');
  if (startPos === -1) return null;

  let depth = 0;
  for (let i = startPos; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') depth--;

    if (depth === 0) {
      return str.substring(startPos, i + 1);
    }
  }
  return null;
}

async function main() {
  if (!fs.existsSync(RAW_DIR)) {
    console.error(`❌ Directorio origen no encontrado: ${RAW_DIR}`);
    return;
  }

  const absoluteTargetDir = path.resolve(TARGET_DIR);
  if (!fs.existsSync(absoluteTargetDir)) {
    fs.mkdirSync(absoluteTargetDir, { recursive: true });
  }

  const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith('.html'));
  console.log(`🔍 Encontrados ${files.length} archivos HTML.`);
  console.log(`📂 Destino: ${absoluteTargetDir}`);

  let extractedCount = 0;

  for (const file of files) {
    const filePath = path.join(RAW_DIR, file);
    const stats = fs.statSync(filePath);

    if (stats.size < 1000) continue;

    const html = fs.readFileSync(filePath, 'utf-8');
    const baseName = file.replace('.html', '');

    // Extraer solo window.profileData (Contiene TODO: datos internos + schema SEO)
    const profileMatch = html.match(/window\.profileData\s*=\s*/);

    if (profileMatch && profileMatch.index !== undefined) {
      const startOfJson = profileMatch.index + profileMatch[0].length;
      const jsonContent = extractBalancedJson(html.substring(startOfJson));

      if (jsonContent) {
        try {
          const data = JSON.parse(jsonContent);
          // Guardamos con un nombre limpio: nombre_perfil.json
          const outputPath = path.join(absoluteTargetDir, `${baseName}.json`);
          fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
          extractedCount++;
        } catch (err: unknown) {
          console.error(
            `❌ Error parseando profileData en ${file}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }
    }
  }

  console.log(`✅ Proceso completado. Se han generado ${extractedCount} archivos JSON maestros.`);
}

main().catch(console.error);
