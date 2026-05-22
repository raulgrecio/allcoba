import fs from 'node:fs';
import path from 'node:path';

const JSONS_DIR = './__data/temp/topescortbabes_jsons';
const OUTPUT_FILE = '../../external/temporal/topescortbabes/master_profile.json';

type JsonObject = Record<string, unknown>;

function isObject(item: unknown): item is JsonObject {
  return Boolean(item) && typeof item === 'object' && !Array.isArray(item);
}

function deepMerge(target: JsonObject, source: JsonObject): JsonObject {
  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        deepMerge(target[key] as JsonObject, source[key] as JsonObject);
      } else if (Array.isArray(source[key])) {
        if (!target[key]) target[key] = [];
        // Combinamos arrays y quitamos duplicados simples
        target[key] = Array.from(
          new Set([...(target[key] as unknown[]), ...(source[key] as unknown[])]),
        );
        // Si son objetos complejos, nos quedamos con una muestra
        if ((target[key] as unknown[]).length > 5)
          target[key] = (target[key] as unknown[]).slice(0, 5);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }
  return target;
}

function main() {
  if (!fs.existsSync(JSONS_DIR)) {
    console.error(`❌ Directorio no encontrado: ${JSONS_DIR}`);
    return;
  }

  const files = fs.readdirSync(JSONS_DIR).filter((f) => f.endsWith('.json'));
  console.log(`🧩 Fusionando ${files.length} archivos JSON...`);

  let masterObject: JsonObject = {};

  for (const file of files) {
    const filePath = path.join(JSONS_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    masterObject = deepMerge(masterObject, data);
  }

  // Aseguramos que el directorio de salida existe
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(masterObject, null, 2));
  console.log(`\n✨ Master JSON generado con éxito en: ${OUTPUT_FILE}`);
}

main();
