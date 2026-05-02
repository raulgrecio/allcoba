import sharp from 'sharp';
import type { ImageHasherPort } from '../../../application/ports/image-hasher.port.js';
import { logger } from '@allcoba/kernel';

export class SharpHasherAdapter implements ImageHasherPort {
  async generateHash(url: string): Promise<string> {
    try {
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      
      // El pHash simplificado: Reducir a 8x8 en escala de grises
      const { data } = await sharp(Buffer.from(buffer))
        .greyscale()
        .resize(8, 8, { fit: 'fill' })
        .raw()
        .toBuffer({ resolveWithObject: true });

      // Calcular la media de los píxeles
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        sum += data[i]!;
      }
      const avg = sum / data.length;

      // Generar el hash de 64 bits (cada bit es 1 si el píxel > media)
      let hash = '';
      for (let i = 0; i < data.length; i++) {
        hash += data[i]! >= avg ? '1' : '0';
      }

      // Convertir binario a hexadecimal para almacenamiento compacto
      return this.binaryToHex(hash);
    } catch (error: any) {
      logger().error({ error: error.message, url }, 'Error generando pHash de imagen');
      return '';
    }
  }

  calculateDistance(hash1: string, hash2: string): number {
    const hex1 = this.hexToBinary(hash1);
    const hex2 = this.hexToBinary(hash2);
    
    let distance = 0;
    for (let i = 0; i < hex1.length; i++) {
      if (hex1[i] !== hex2[i]) distance++;
    }
    return distance;
  }

  private binaryToHex(binary: string): string {
    let hex = '';
    for (let i = 0; i < binary.length; i += 4) {
      hex += parseInt(binary.substring(i, i + 4), 2).toString(16);
    }
    return hex;
  }

  private hexToBinary(hex: string): string {
    let binary = '';
    for (let i = 0; i < hex.length; i++) {
      binary += parseInt(hex[i]!, 16).toString(2).padStart(4, '0');
    }
    return binary;
  }
}
