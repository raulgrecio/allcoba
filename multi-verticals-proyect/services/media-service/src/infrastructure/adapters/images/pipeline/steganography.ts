import sharp from 'sharp';

export interface SteganographyResult {
  readonly stegoText: string;
  readonly hasStegoText: boolean;
}

/**
 * Esteganografía (Etapa de Análisis de Píxeles Ocultos):
 * Analiza la imagen a nivel de píxeles crudos para decodificar texto oculto en los bits
 * menos significativos (LSB) de los canales de color.
 *
 * Los adaptadores y portales a veces inyectan identificadores de tracking, fechas, URLs
 * o firmas invisibles utilizando esteganografía LSB.
 */
export async function steganographyAnalysis(buffer: Buffer): Promise<SteganographyResult> {
  try {
    // 1. Obtener los píxeles crudos RGBA/RGB sin compresión
    const { data: rawPixels } = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });

    let stegoText = '';
    const maxChars = 200; // Límite seguro para evitar análisis infinito de ruido de color
    const bitsNeeded = maxChars * 8;
    const limit = Math.min(rawPixels.length, bitsNeeded);

    let currentByte = 0;
    let bitCount = 0;
    let printableStreak = 0;

    for (let i = 0; i < limit; i++) {
      const lsb = rawPixels[i]! & 1;
      // Reconstrucción Little-Endian de bits a bytes
      currentByte |= lsb << bitCount;
      bitCount++;

      if (bitCount === 8) {
        if (currentByte === 0) {
          // Encontrado terminador nulo de cadena standard \0
          break;
        }

        // Comprobar si el byte reconstruido es un carácter ASCII imprimible común
        const isPrintable =
          (currentByte >= 32 && currentByte <= 126) ||
          currentByte === 10 || // Nueva línea
          currentByte === 13; // Retorno de carro

        if (isPrintable) {
          stegoText += String.fromCharCode(currentByte);
          printableStreak++;
        } else {
          // Si rompe la racha de caracteres legibles muy pronto, es ruido de la imagen real
          if (printableStreak < 5) {
            stegoText = '';
            break;
          }
          // Si ya teníamos un mensaje legible largo y entra ruido, detenemos la lectura
          break;
        }

        currentByte = 0;
        bitCount = 0;
      }
    }

    const hasStegoText = stegoText.trim().length >= 6;
    return {
      stegoText: hasStegoText ? stegoText.trim() : '',
      hasStegoText,
    };
  } catch {
    // Silencioso para evitar romper el pipeline entero si no hay acceso a píxeles crudos
    return { stegoText: '', hasStegoText: false };
  }
}
