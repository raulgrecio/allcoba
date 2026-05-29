import fs from 'fs/promises';
import path from 'path';

import { logger } from '@allcoba/kernel';

import type { StoragePort } from '#application/ports/storage.port.js';

export class LocalStorageAdapter implements StoragePort {
  private readonly storageDir: string;

  constructor({ baseDir }: { baseDir?: string } = {}) {
    // Para simplificar el desarrollo local, almacenamos las imágenes en el directorio común del scraper
    const defaultDir = path.resolve(process.cwd(), '../scraper-service/__data/storage');
    this.storageDir = baseDir ? path.resolve(process.cwd(), baseDir) : defaultDir;
  }

  async init() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      logger().info(
        { dir: this.storageDir },
        'Directorio de almacenamiento local inicializado en media-service',
      );
    } catch (error) {
      logger().error(
        { error: error instanceof Error ? error.message : String(error) },
        'Error creando directorio de almacenamiento en media-service',
      );
    }
  }

  private resolveSafePath(fileName: string): string {
    const resolvedPath = path.resolve(this.storageDir, fileName);
    const normalizedStorageDir = path.resolve(this.storageDir);

    if (
      !resolvedPath.startsWith(normalizedStorageDir + path.sep) &&
      resolvedPath !== normalizedStorageDir
    ) {
      throw new Error('Directory traversal attempt detected');
    }
    return resolvedPath;
  }

  async upload(buffer: Buffer, fileName: string, _mimeType: string): Promise<string> {
    await this.init();
    const filePath = this.resolveSafePath(fileName);

    // Asegurar que el directorio del archivo (ej: raw/, images/) existe
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    await fs.writeFile(filePath, buffer);

    // Devolvemos la ruta absoluta como URL simulada
    return `file://${filePath}`;
  }

  async delete(fileName: string): Promise<void> {
    try {
      const filePath = this.resolveSafePath(fileName);
      await fs.unlink(filePath);
    } catch {
      // Ignorar si no existe o es intento de traversal inválido
    }
  }

  async exists(fileName: string): Promise<boolean> {
    try {
      const filePath = this.resolveSafePath(fileName);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
