import { describe, it, expect } from 'vitest';
import { ConsolidationService } from '@/domain/services/consolidation.service.js';
import { VerificationStatus } from '@/domain/entities/provider.js';
import { RawExtraction } from '@/application/ports/source.port.js';

describe('Unit: ConsolidationService', () => {
  const service = new ConsolidationService();

  const mockRaw: RawExtraction = {
    source: 'fotocasa',
    externalId: '123',
    name: 'Piso de lujo',
    price: 500000,
    phones: ['+34919032747'],
    vertical: 'real-estate',
    attributes: { rooms: 3, surface: 100 },
    metadata: { sourceUrl: 'http://test.com', timestamp: new Date().toISOString(), durationMs: 100 }
  };

  it('debería proponer CREATE si no hay candidatos', () => {
    const result = service.consolidate(mockRaw, []);
    
    expect(result.action).toBe('CREATE');
    expect(result.confidenceScore).toBe(1.0);
    expect(result.mergedData.displayName).toBe(mockRaw.name);
  });

  it('debería detectar coincidencia por Telegram', () => {
    const raw: any = {
      source: 'idealista',
      externalId: '123',
      phones: [],
      telegram: '@testuser',
      name: 'Piso Telegram'
    };

    const candidate: any = {
      id: 'existing-id',
      phones: [],
      telegram: '@testuser',
      images: [],
      externalIds: {}
    };

    const result = service.consolidate(raw, [candidate]);
    expect(result.action).toBe('FLAG_FOR_REVIEW');
    expect(result.confidenceScore).toBe(0.8);
    expect(result.newSignals.some(s => s.type === 'TELEGRAM_MATCH')).toBe(true);
  });

  it('debería detectar coincidencia por ubicación cercana', () => {
    const raw: any = {
      source: 'idealista',
      externalId: '123',
      phones: [],
      coordinates: { lat: 40.4167, lng: -3.7033 }, // Madrid Sol
      name: 'Piso Sol'
    };

    const candidate: any = {
      id: 'existing-id',
      phones: [],
      images: [],
      address: {
        coordinates: { lat: 40.4168, lng: -3.7034 } // A pocos metros
      },
      externalIds: {}
    };

    const result = service.consolidate(raw, [candidate]);
    // Con 0.3 de confianza (solo ubicación), la acción es CREATE pero con señales
    expect(result.action).toBe('CREATE');
    expect(result.newSignals.some(s => s.type === 'LOCATION_MATCH')).toBe(true);
  });

  it('debería proponer MERGE si coincide el externalId (Confianza 1.0)', () => {
    const existingProvider: any = {
      id: 'uuid-1',
      externalIds: { 'fotocasa': '123' },
      phones: ['+34919032747'],
      images: []
    };

    const result = service.consolidate(mockRaw, [existingProvider]);

    expect(result.action).toBe('MERGE');
    expect(result.targetProviderId).toBe('uuid-1');
    expect(result.confidenceScore).toBe(1.0);
    expect(result.newSignals.some(s => s.type === 'EXTERNAL_ID_MATCH')).toBe(true);
  });

  it('debería proponer FLAG_FOR_REVIEW si coincide el teléfono', () => {
    const existingProvider: any = {
      id: 'uuid-2',
      externalIds: { 'fotocasa': '999' },
      phones: ['+34919032747'],
      images: []
    };

    const result = service.consolidate(mockRaw, [existingProvider]);

    expect(result.action).toBe('FLAG_FOR_REVIEW');
    expect(result.newSignals.some(s => s.type === 'PHONE_MATCH')).toBe(true);
  });

  it('debería deduplicar imágenes por hash durante el merge', () => {
    const existingProvider: any = {
      id: 'uuid-1',
      externalIds: { 'fotocasa': '123' },
      phones: [],
      images: [{ url: 'old.jpg', hash: 'hash1' }]
    };

    const rawWithImages = {
      ...mockRaw,
      processedImages: [
        { url: 'new.jpg', hash: 'hash1' },
        { url: 'fresh.jpg', hash: 'hash2' }
      ]
    } as any;

    const result = service.consolidate(rawWithImages, [existingProvider]);

    expect(result.mergedData.images).toHaveLength(2);
    expect(result.mergedData.images?.map((img: any) => img.hash)).toContain('hash1');
    expect(result.mergedData.images?.map((img: any) => img.hash)).toContain('hash2');
  });
});
