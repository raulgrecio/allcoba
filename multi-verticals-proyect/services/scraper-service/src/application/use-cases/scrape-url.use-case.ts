import { logger } from '@allcoba/kernel';
import type { SourcePort, RawExtraction } from '../ports/source.port.js';
import type { ProviderRepositoryPort } from '../ports/repository.port.js';
import { ConsolidationService } from '../../domain/services/consolidation.service.js';
import type { Provider } from '../../domain/entities/provider.js';
import type { ImageHasherPort } from '../ports/image-hasher.port.js';

export class ScrapeUrlUseCase {
  constructor(
    private readonly sources: SourcePort[],
    private readonly repository: ProviderRepositoryPort,
    private readonly consolidationService: ConsolidationService,
    private readonly imageHasher: ImageHasherPort
  ) {}

  async execute(url: string): Promise<void> {
    // 1. Encontrar adaptador de fuente
    const source = this.sources.find(s => s.canHandle(url));
    if (!source) {
      throw new Error(`No se encontró un adaptador para la URL: ${url}`);
    }

    // 2. Verificar robots.txt
    const isAllowed = await source.isAllowed(url);
    if (!isAllowed) {
      throw new Error(`El acceso a la URL está restringido por robots.txt: ${url}`);
    }

    // 3. Extraer datos crudos
    const raw = await source.extract(url);
    
    // 3.5. Generar hashes de imágenes (opcional/paralelo)
    const imageHashes = await Promise.all(
      raw.imageUrls.slice(0, 5).map(imgUrl => this.imageHasher.generateHash(imgUrl))
    );
    const rawWithHashes = { ...raw, imageHashes: imageHashes.filter(h => h !== '') };

    logger().info({ 
      source: raw.source,
      name: raw.name,
      price: raw.attributes.price,
      imagesCount: raw.imageUrls.length,
      hashesGenerated: rawWithHashes.imageHashes.length
    }, 'Datos extraídos y procesados correctamente');

    // 4. Buscar candidatos para consolidación
    const candidates = await this.repository.find({
      phone: raw.phones[0],
      telegram: raw.telegram,
      externalId: { source: source.identifier, id: raw.externalId }
    });

    // 5. Consolidar
    const result = this.consolidationService.consolidate(rawWithHashes as any, candidates);

    // 6. Ejecutar acción
    switch (result.action) {
      case 'CREATE':
        await this.repository.save(this.createProvider(result.mergedData));
        break;
      
      case 'MERGE':
        if (result.targetProviderId) {
          await this.repository.update(result.targetProviderId, {
            ...result.mergedData,
            confidenceScore: result.confidenceScore,
            // Aquí añadiríamos las nuevas señales
          });
        }
        break;

      case 'FLAG_FOR_REVIEW':
        if (result.targetProviderId) {
          await this.repository.update(result.targetProviderId, {
            ...result.mergedData,
            confidenceScore: result.confidenceScore,
            // Marcar estado como pendiente de revisión
          });
        }
        break;
      
      case 'IGNORE':
        break;
    }
  }

  private createProvider(data: Partial<Provider>): Provider {
    return {
      id: crypto.randomUUID(),
      displayName: data.displayName,
      phones: data.phones || [],
      telegram: data.telegram,
      email: data.email,
      address: data.address,
      description: data.description,
      images: data.images || [],
      imageHashes: (data as any).imageHashes || [],
      vertical: data.vertical || 'unknown',
      externalIds: data.externalIds || {},
      verificationStatus: data.verificationStatus!,
      confidenceScore: data.confidenceScore || 1.0,
      signals: [],
      metadata: data.metadata || {},
      lastScrapedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
