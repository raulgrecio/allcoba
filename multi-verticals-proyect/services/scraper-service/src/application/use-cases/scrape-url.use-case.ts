import { Buffer } from 'buffer';
import crypto from 'crypto';

import { logger } from '@allcoba/kernel';

import type { SourcePort, RawExtraction } from '../ports/source.port.js';
import type { ProviderRepositoryPort } from '../ports/repository.port.js';
import { ConsolidationService } from '../../domain/services/consolidation.service.js';
import type { Provider } from '../../domain/entities/provider.js';
import type { ImageHasherPort } from '../ports/image-hasher.port.js';
import type { StoragePort } from '../ports/storage.port.js';

export interface ScraperConfig {
  maxImagesToProcess: number;
}

const DEFAULT_CONFIG: ScraperConfig = {
  maxImagesToProcess: 5
};

export class ScrapeUrlUseCase {
  constructor(
    private readonly sources: SourcePort[],
    private readonly repository: ProviderRepositoryPort,
    private readonly consolidationService: ConsolidationService,
    private readonly imageHasher: ImageHasherPort,
    private readonly storage: StoragePort,
    private readonly config: ScraperConfig = DEFAULT_CONFIG
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
    logger().info({ imageUrlsCount: raw.imageUrls.length }, 'HTML extraído, iniciando hashing de imágenes...');

    // 3.5. Procesar imágenes: Hash + Almacenamiento
    const processedImages = await Promise.all(
      raw.imageUrls.slice(0, this.config.maxImagesToProcess).map(async (imgUrl, i) => {
        try {
          // 1. Descargar (Necesario para el Hash)
          const response = await fetch(imgUrl);
          const buffer = await response.arrayBuffer();
          const nodeBuffer = Buffer.from(buffer);

          // 2. Generar Hash
          const hash = await this.imageHasher.generateHash(nodeBuffer);

          // 3. ¿Ya tenemos este hash?
          const existingProviders = await this.repository.find({ imageHash: hash });
          if (existingProviders.length > 0) {
            const existingProvider = existingProviders[0]!;
            const existingImg = existingProvider.images.find(img => img.hash === hash);
            const existingUrl = existingImg?.url || existingProvider.images[0]?.url;

            logger().info({ hash }, 'pHash detectado en otro proveedor, reutilizando imagen existente');
            return { hash, storedUrl: existingUrl!, originalUrl: imgUrl };
          }

          // 4. Si es nuevo, guardar en nuestro storage
          const sanitizedId = raw.externalId.replace(/[^a-z0-9]/gi, '_');
          const fileName = `${raw.source}_${sanitizedId}_${i}.jpg`;
          const storedUrl = await this.storage.upload(nodeBuffer, fileName, 'image/jpeg');

          return { hash, storedUrl, originalUrl: imgUrl };
        } catch (error) {
          logger().error({ imgUrl, error }, 'Error procesando imagen');
          return null;
        }
      })
    );

    const validImages = (processedImages.filter(img => img !== null) as any[]);
    const rawWithImages = {
      ...raw,
      processedImages: validImages.map(img => ({
        url: img.storedUrl,
        originalUrl: img.originalUrl,
        hash: img.hash
      }))
    };

    logger().info({
      source: raw.source,
      name: raw.name,
      price: raw.price,
      imagesStored: rawWithImages.processedImages.length
    }, 'Procesamiento completo, buscando candidatos...');

    // 4. Buscar candidatos para consolidación
    const candidates = await this.repository.find({
      phone: raw.phones[0],
      telegram: raw.telegram,
      externalId: { source: source.identifier, id: raw.externalId }
    });

    // 5. Consolidar
    const result = this.consolidationService.consolidate(rawWithImages as any, candidates);

    // 6. Ejecutar acción
    switch (result.action) {
      case 'CREATE':
        await this.repository.create(this.createProvider(result.mergedData));
        break;

      case 'MERGE':
      case 'FLAG_FOR_REVIEW':
        if (result.targetProviderId) {
          const existing = await this.repository.findById(result.targetProviderId);
          if (existing) {
             await this.repository.update({
               ...existing,
               ...result.mergedData,
               confidenceScore: result.confidenceScore,
               updatedAt: new Date()
             });
          }
        }
        break;

      case 'IGNORE':
        break;
    }
  }

  private createProvider(data: Partial<Provider>): Provider {
    return {
      id: crypto.randomUUID(),
      displayName: data.displayName || 'Sin nombre',
      phones: data.phones || [],
      telegram: data.telegram,
      email: data.email,
      address: data.address,
      description: data.description,
      price: data.price,
      images: data.images || (data as any).processedImages || [],
      vertical: data.vertical || 'unknown',
      externalIds: data.externalIds || {},
      verificationStatus: data.verificationStatus || 'unverified',
      confidenceScore: data.confidenceScore || 1.0,
      signals: [],
      metadata: data.metadata || {},
      attributes: data.attributes || {},
      lastScrapedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
