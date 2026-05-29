/**
 * script: test-watermark-regex-matching.ts
 *
 * Propósito:
 * Valida y confirma que los patrones regex altamente tolerantes a fallos (OCR-aberration patterns)
 * del BRAND_DICTIONARY capturen correctamente las lecturas distorsionadas reales que Tesseract
 * produce cuando analiza marcas de agua complejas o de baja resolución.
 */

import { BRAND_DICTIONARY } from '../../src/infrastructure/utils/regex-patterns.js';

const mockOcrOutputs = [
  {
    portal: 'ErosGuia',
    text: '\\ 1. y “o | i “= E | orosyLia ear 3 y \\ o | | hE  Le A | SEA J)',
  },
  {
    portal: 'ErosGuia',
    text: '"\na\n£5\n74\n” e\ny\nr\n4 OSC LIE. CO\n£\nsi 4 3\n: ¿\n\nK aa |\n\' I\n',
  },
  {
    portal: 'ErosGuia',
    text: 'dil=l, COM\nit —\n| Ra\nNET\nia  “\n',
  },
  {
    portal: 'EscortAdvisor',
    text: '- 1 a 0 cortadvis |\né: |\n— == |\nds Y |\n- |\n\\ |\n\n',
  },
  {
    portal: 'EscortAdvisor',
    text: 'a rta dviso A :\n.\n| E\na -\n-\n\nLB i\n',
  },
  {
    portal: 'EuroGirlsEscort',
    text: '— .\nFf ee yo | 28\nuroCLg Le SCOPNENs ox\n',
  },
  {
    portal: 'EuroGirlsEscort',
    text: 'Y ERA KK\nNames. 94 NXE\ny mo / AA 107477. 0 XI\n- 0 Nd , PI\ny 47 8% E\n100 XD: ES\nSan EY\nEuro Na N S >”\n',
  },
];

console.log('=== DEBUG: VALIDACIÓN DE EXPRESIONES REGULARES DE MARCA DE AGUA ===');
let totalMatches = 0;

for (const mock of mockOcrOutputs) {
  console.log(`\nProbando texto OCR real de [${mock.portal}]:`);
  console.log(JSON.stringify(mock.text));

  let matchFound = false;
  BRAND_DICTIONARY.forEach((brand) => {
    const isMatch = brand.patterns.some((pattern) => pattern.test(mock.text));
    if (isMatch) {
      console.log(`  🟢 COINCIDENCIA: Detectado como marca [${brand.name}]`);
      if (brand.name === mock.portal) {
        matchFound = true;
      }
    }
  });

  if (matchFound) {
    totalMatches++;
  } else {
    console.log(`  ❌ ERROR: El texto no fue correctamente emparejado con su portal.`);
  }
}

console.log(
  `\nResumen: ${totalMatches}/${mockOcrOutputs.length} distorsiones resueltas exitosamente.`,
);
