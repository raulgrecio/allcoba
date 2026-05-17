import fs from 'fs/promises';
import path from 'path';

import { logger } from '@allcoba/kernel';

import type { StoragePort } from '#application/ports/storage.port.js';

export class LocalStorageAdapter implements StoragePort {
  private readonly storageDir: string;

  constructor({ baseDir = path.join('__data', 'storage') }: { baseDir?: string } = {}) {
    this.storageDir = path.resolve(process.cwd(), baseDir);
  }

  async init() {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      logger().info({ dir: this.storageDir }, 'Directorio de almacenamiento local inicializado');
    } catch (error: any) {
      logger().error({ error: error.message }, 'Error creando directorio de almacenamiento');
    }
  }

  async upload(buffer: Buffer, fileName: string, _mimeType: string): Promise<string> {
    await this.init();
    const filePath = path.join(this.storageDir, fileName);

    // Asegurar que el directorio del archivo (ej: raw/, images/) existe
    await fs.mkdir(path.dirname(filePath), { recursive: true });

    await fs.writeFile(filePath, buffer);

    // Devolvemos la ruta absoluta como URL simulada
    return `file://${filePath}`;
  }

  async delete(fileName: string): Promise<void> {
    const filePath = path.join(this.storageDir, fileName);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // Ignorar si no existe
    }
  }

  async exists(fileName: string): Promise<boolean> {
    const filePath = path.join(this.storageDir, fileName);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
