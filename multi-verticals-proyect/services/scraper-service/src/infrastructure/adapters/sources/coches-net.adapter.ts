import { BaseSourceAdapter } from './base-source.adapter.js';
import type { RawExtraction } from '../../../application/ports/source.port.js';
import { Vertical } from '../../../domain/entities/vertical.js';

/**
 * Ejemplo de Adaptador Especialista (Solo Motor)
 */
export class CochesNetAdapter extends BaseSourceAdapter {
  readonly identifier = 'coches.net';
  readonly defaultVertical = Vertical.MOTOR;

  canHandle(url: string): boolean {
    return url.includes('coches.net');
  }

  async extract(url: string): Promise<RawExtraction> {
    // Aquí iría la lógica de Playwright específica para coches.net
    throw new Error('No implementado todavía');
  }
}
