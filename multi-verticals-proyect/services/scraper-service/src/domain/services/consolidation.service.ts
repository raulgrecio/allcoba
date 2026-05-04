import { logger } from '@allcoba/kernel';

import type { RawExtraction } from '../../application/ports/source.port.js';
import { VerificationStatus, type Provider, type ScraperSignal } from '../entities/provider.js';

export type ConsolidationAction = 'CREATE' | 'MERGE' | 'FLAG_FOR_REVIEW' | 'IGNORE';

export interface ConsolidationResult {
  action: ConsolidationAction;
  targetProviderId?: string;
  confidenceScore: number;
  newSignals: ScraperSignal[];
  mergedData: Partial<Provider>;
}

export class ConsolidationService {
  private readonly logger = logger().child({ component: ConsolidationService.name });
  /**
   * Analiza una extracción cruda contra los candidatos existentes para decidir qué acción tomar.
   */
  consolidate(raw: RawExtraction, candidates: Provider[]): ConsolidationResult {
    this.logger.debug(
      { source: raw.source, externalId: raw.externalId, candidatesCount: candidates.length },
      'Iniciando consolidación',
    );
    const signals: ScraperSignal[] = [];
    let bestMatch: Provider | null = null;
    let maxConfidence = 0;

    for (const candidate of candidates) {
      const matchDetails = this.calculateMatch(raw, candidate);

      if (matchDetails.confidence > maxConfidence) {
        maxConfidence = matchDetails.confidence;
        bestMatch = candidate;
        signals.push(...matchDetails.signals);
      }
    }

    // 1. Coincidencia muy alta -> Fusionar automáticamente
    if (bestMatch && maxConfidence >= 0.95) {
      return {
        action: 'MERGE',
        targetProviderId: bestMatch.id,
        confidenceScore: maxConfidence,
        newSignals: signals,
        mergedData: this.mergeData(bestMatch, raw),
      };
    }

    // 2. Coincidencia media -> Marcar para revisión (Posible Fusión o Fraude)
    if (bestMatch && maxConfidence >= 0.6) {
      return {
        action: 'FLAG_FOR_REVIEW',
        targetProviderId: bestMatch.id,
        confidenceScore: maxConfidence,
        newSignals: signals,
        mergedData: this.mergeData(bestMatch, raw),
      };
    }

    // 3. Sin coincidencias claras -> Crear nuevo
    return {
      action: 'CREATE',
      confidenceScore: 1.0,
      newSignals: signals,
      mergedData: this.mapToProvider(raw),
    };
  }

  private calculateMatch(
    raw: RawExtraction,
    candidate: Provider,
  ): { confidence: number; signals: ScraperSignal[] } {
    let score = 0;
    const signals: ScraperSignal[] = [];

    // Match por teléfono
    const commonPhones = raw.phones.filter((p) => candidate.phones.includes(p));
    if (commonPhones.length > 0) {
      score += 0.9;
      signals.push({
        type: 'PHONE_MATCH',
        sourceId: raw.externalId,
        confidence: 0.9,
        metadata: { commonPhones },
        createdAt: new Date(),
      });
    }

    // Match por Telegram
    if (raw.telegram && raw.telegram === candidate.telegram) {
      score += 0.8;
      signals.push({
        type: 'TELEGRAM_MATCH',
        sourceId: raw.externalId,
        confidence: 0.8,
        metadata: { telegram: raw.telegram },
        createdAt: new Date(),
      });
    }

    // Match por ubicación (si están muy cerca)
    if (raw.coordinates && candidate.address?.coordinates) {
      const distance = this.calculateDistance(raw.coordinates, candidate.address.coordinates);
      if (distance < 0.1) {
        // Menos de 100 metros
        score += 0.3;
        const signal: ScraperSignal = {
          type: 'LOCATION_MATCH',
          sourceId: raw.externalId,
          confidence: 0.3,
          metadata: { distanceKm: distance },
          createdAt: new Date(),
        };
        signals.push(signal);
        this.logger.debug({ distanceKm: distance }, 'Señal LOCATION_MATCH detectada');
      }
    }

    // Match por externalId (¡El más fuerte!)
    const source = raw.source;
    if (candidate.externalIds[source] === raw.externalId) {
      score += 1.0;
      signals.push({
        type: 'EXTERNAL_ID_MATCH',
        sourceId: raw.externalId,
        confidence: 1.0,
        metadata: { source, externalId: raw.externalId },
        createdAt: new Date(),
      });
    }

    return {
      confidence: Math.min(score, 1.0),
      signals,
    };
  }

  private mergeData(existing: Provider, raw: RawExtraction): Partial<Provider> {
    // Los datos manuales del usuario (si existieran) deberían tener prioridad.
    // Aquí asumimos que estamos mergeando datos de scraper.
    return {
      phones: Array.from(new Set([...existing.phones, ...raw.phones])),
      telegram: existing.telegram || raw.telegram,
      email: existing.email || raw.email,
      price: raw.price || existing.price,
      description: existing.description || raw.description,
      images: this.deduplicateImages(existing.images, (raw as any).processedImages || []),
      attributes: { ...existing.attributes, ...raw.attributes },
      metadata: { ...existing.metadata, ...raw.metadata, lastMergedAt: new Date() },
    };
  }

  private deduplicateImages(existing: any[], incoming: any[]): any[] {
    const combined = [...existing, ...incoming];
    const seen = new Set();
    return combined.filter((img) => {
      if (!img.hash) return true; // Si no tiene hash (raro), lo dejamos
      if (seen.has(img.hash)) return false;
      seen.add(img.hash);
      return true;
    });
  }

  private mapToProvider(raw: RawExtraction): Partial<Provider> {
    return {
      displayName: raw.name,
      phones: raw.phones,
      telegram: raw.telegram,
      email: raw.email,
      price: raw.price,
      address: raw.address ? { text: raw.address, coordinates: raw.coordinates } : undefined,
      description: raw.description,
      images: (raw as any).processedImages || [],
      vertical: raw.vertical,
      externalIds: { [raw.source]: raw.externalId },
      verificationStatus: VerificationStatus.PENDING_REVIEW,
      confidenceScore: 1.0,
      attributes: raw.attributes,
      metadata: raw.metadata || {},
    };
  }

  private calculateDistance(
    p1: { lat: number; lng: number },
    p2: { lat: number; lng: number },
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
