import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const JSONS_DIR = './__data/temp/topescortbabes_jsons';
const TYPES_DIR = '../../external/temporal/topescortbabes/types';

function main() {
  if (!fs.existsSync(TYPES_DIR)) {
    fs.mkdirSync(TYPES_DIR, { recursive: true });
  }

  const files = fs.readdirSync(JSONS_DIR).filter((f) => f.endsWith('.json'));
  console.log(`🚀 Generando tipos para ${files.length} archivos...`);

  for (const file of files) {
    const inputPath = path.join(JSONS_DIR, file);
    const outputName = file.replace('.json', '.ts');
    const outputPath = path.join(TYPES_DIR, outputName);

    // El nombre de la interfaz será el nombre del archivo (sin extensión ni prefijos raros)
    const typeName = 'TopEscortProfile';

    console.log(`📄 Procesando ${file}...`);

    try {
      // Ejecutamos quicktype para cada archivo
      // --lang ts: genera TypeScript
      // --just-types: solo las interfaces/tipos, sin funciones de serialización
      // --top-level: nombre de la interfaz principal
      execSync(
        `npx quicktype "${inputPath}" -o "${outputPath}" --lang ts --just-types --top-level ${typeName}`,
        { stdio: 'inherit' },
      );
    } catch (err: unknown) {
      console.error(
        `❌ Error generando tipos para ${file}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  console.log(`\n✅ Proceso completado. Todos los tipos generados en ${TYPES_DIR}`);
}

main();
