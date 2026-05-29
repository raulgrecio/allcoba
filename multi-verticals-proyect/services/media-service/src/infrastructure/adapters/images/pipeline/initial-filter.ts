import sharp from 'sharp';

export interface FilterResult {
  readonly isValid: boolean;
  readonly rejectReason?: string;
  readonly metadata?: {
    readonly width: number;
    readonly height: number;
    readonly format: string;
  };
}

/**
 * Filtro Crítico (Etapa 1):
 * Evalúa el buffer de imagen cruda ANTES de guardarlo o hacer procesamiento pesado.
 * Rechaza si:
 *  - Formato de imagen no soportado (solo permite JPG/JPEG, PNG, WebP)
 *  - Es un GIF (animado o no)
 *  - Es una imagen animada (múltiples frames en WebP o PNG)
 *  - Está corrupto o no se puede decodificar con Sharp
 *  - Sus dimensiones son ridículamente pequeñas (< 50px de ancho o alto)
 */
export async function initialFilter(buffer: Buffer): Promise<FilterResult> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.format) {
      return { isValid: false, rejectReason: 'Unknown image format' };
    }

    const format = metadata.format.toLowerCase();

    // 1. MIME type validation (solo jpeg, png, webp)
    const allowedFormats = ['jpeg', 'png', 'webp', 'jpg'];
    if (!allowedFormats.includes(format)) {
      return { isValid: false, rejectReason: `MIME type not allowed: image/${format}` };
    }

    // 2. Evitar GIFs
    if (format === 'gif') {
      return { isValid: false, rejectReason: 'GIF images are not allowed' };
    }

    // 3. Evitar imágenes animadas (múltiples frames detectables en metadata.pages)
    if (metadata.pages && metadata.pages > 1) {
      return { isValid: false, rejectReason: 'Animated images are not allowed' };
    }

    // 4. Comprobar dimensiones absurdas (< 50px)
    const width = metadata.width || 0;
    const height = metadata.height || 0;
    if (width < 50 || height < 50) {
      return { isValid: false, rejectReason: `Dimensions too small or absurd: ${width}x${height}` };
    }

    return {
      isValid: true,
      metadata: {
        width,
        height,
        format,
      },
    };
  } catch (error) {
    return {
      isValid: false,
      rejectReason: `Corrupted file or decode failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
