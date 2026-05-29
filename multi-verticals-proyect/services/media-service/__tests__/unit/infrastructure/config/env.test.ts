import { describe, expect, it } from 'vitest';

import { config, parseConfig } from '#infrastructure/config/env.js';

describe('env config', () => {
  describe('parseConfig', () => {
    it('debería usar valores por defecto correctos cuando el env está vacío', () => {
      const parsed = parseConfig({});
      expect(parsed.port).toBe(3002);
      expect(parsed.nodeEnv).toBe('development');
      expect(parsed.logLevel).toBe('info');
      expect(parsed.ocrEnabled).toBe(false);
      expect(parsed.databaseUrl).toBeUndefined();
      expect(parsed.queueEnabled).toBe(false);
      expect(parsed.isProduction).toBe(false);
      expect(parsed.isDevelopment).toBe(true);
    });

    it('debería procesar PORT y NODE_ENV correctamente', () => {
      const parsed = parseConfig({
        PORT: '4000',
        NODE_ENV: 'production',
      });
      expect(parsed.port).toBe(4000);
      expect(parsed.nodeEnv).toBe('production');
      expect(parsed.isProduction).toBe(true);
      expect(parsed.isDevelopment).toBe(false);
    });

    it('debería procesar OCR_ENABLED y QUEUE_ENABLED a true cuando son "true" o "1"', () => {
      const parsedTrue = parseConfig({
        OCR_ENABLED: 'true',
        QUEUE_ENABLED: 'true',
      });
      expect(parsedTrue.ocrEnabled).toBe(true);
      expect(parsedTrue.queueEnabled).toBe(true);

      const parsedOne = parseConfig({
        OCR_ENABLED: '1',
        QUEUE_ENABLED: '1',
      });
      expect(parsedOne.ocrEnabled).toBe(true);
      expect(parsedOne.queueEnabled).toBe(true);
    });

    it('debería procesar OCR_ENABLED y QUEUE_ENABLED a false cuando son distintos de "true" o "1"', () => {
      const parsedFalse = parseConfig({
        OCR_ENABLED: 'false',
        QUEUE_ENABLED: '0',
      });
      expect(parsedFalse.ocrEnabled).toBe(false);
      expect(parsedFalse.queueEnabled).toBe(false);
    });

    it('debería retornar el DATABASE_URL si está definido', () => {
      const parsed = parseConfig({
        DATABASE_URL: 'postgres://user:pass@host/db',
      });
      expect(parsed.databaseUrl).toBe('postgres://user:pass@host/db');
    });
  });

  describe('config Proxy', () => {
    it('debería delegar las propiedades correctamente', () => {
      expect(config.port).toBeDefined();
      expect(typeof config.port).toBe('number');
      expect(config.isDevelopment).toBeDefined();
    });
  });
});
