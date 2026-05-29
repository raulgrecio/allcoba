export interface StoragePort {
  /**
   * Sube un archivo (buffer) al almacenamiento y devuelve la URL pública o ruta.
   */
  upload(buffer: Buffer, fileName: string, mimeType: string): Promise<string>;

  /**
   * Elimina un archivo del almacenamiento.
   */
  delete(fileName: string): Promise<void>;

  /**
   * Verifica si un archivo existe.
   */
  exists(fileName: string): Promise<boolean>;
}
