import type { Provider, ProviderCriteria } from '../../domain/entities/provider.js';

export interface ProviderRepositoryPort {
  /**
   * Busca proveedores que cumplan con los criterios especificados.
   * Permite búsquedas flexibles por teléfono, telegram, email, etc.
   */
  find(criteria: ProviderCriteria): Promise<Provider[]>;

  /**
   * Crea un nuevo proveedor.
   */
  create(provider: Provider): Promise<void>;

  /**
   * Actualiza campos específicos de un proveedor.
   */
  update(id: string, provider: Partial<Provider>): Promise<void>;

  /**
   * Busca un proveedor por su ID único interno.
   */
  findById(id: string): Promise<Provider | null>;
}
