import { BaseSourceAdapter } from './base-source.adapter.js';
import type { RawExtraction } from '../../../application/ports/source.port.js';
import { Vertical } from '../../../domain/entities/vertical.js';

/**
 * Ejemplo de Adaptador Generalista (Multi-vertical)
 */
export class WallapopAdapter extends BaseSourceAdapter {
  readonly identifier = 'wallapop';
  readonly defaultVertical = Vertical.GENERAL;

  canHandle(url: string): boolean {
    return url.includes('wallapop.com');
  }

  /**
   * Sobreescribimos la detección para Wallapop porque es mixto
   */
  protected detectVertical(url: string): Vertical {
    if (url.includes('/c11545-coches/')) return Vertical.MOTOR;
    if (url.includes('/c11098-inmobiliaria/')) return Vertical.REAL_ESTATE;
    if (url.includes('/c12485-servicios/')) return Vertical.SERVICES;
    
    return Vertical.GENERAL;
  }

  async extract(url: string): Promise<RawExtraction> {
    // Aquí iría la lógica de extracción dinámica de Wallapop
    throw new Error('No implementado todavía');
  }
}
