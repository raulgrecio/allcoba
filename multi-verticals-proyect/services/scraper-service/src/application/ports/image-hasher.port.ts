export interface ImageHasherPort {
  /**
   * Genera un perceptual hash (pHash) de una imagen a partir de su URL o buffer.
   * El pHash permite comparar imágenes similares aunque cambien de tamaño o formato.
   */
  generateHash(url: string): Promise<string>;

  /**
   * Calcula la distancia de Hamming entre dos hashes. 
   * Una distancia baja (ej: < 5) indica que las imágenes son casi idénticas.
   */
  calculateDistance(hash1: string, hash2: string): number;
}
