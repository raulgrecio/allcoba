import { describe, expect, it, beforeAll } from 'vitest';
import { extractChicasmalas } from '#infrastructure/adapters/sources/dating/chicasmalas/chicasmalas.extractor.js';
import type { ChicasmalasPayload } from '#infrastructure/adapters/sources/dating/chicasmalas/chicasmalas.types.js';
import { loadHtml } from './helpers/load-fixtures.js';

const SOURCE_URL = 'https://www.chicasmalas.es/anuncios/sofia-deluxe/';

describe('extractChicasmalas — fixture sofia-deluxe (perfil Elementor real)', () => {
  let payload: ChicasmalasPayload;

  beforeAll(() => {
    const html = loadHtml('sofia-deluxe.html');
    payload = extractChicasmalas(html, SOURCE_URL);
  });

  it('sourceId = URL slug', () => expect(payload.sourceId).toBe('sofia-deluxe'));
  it('sourceUrl preserved', () => expect(payload.sourceUrl).toBe(SOURCE_URL));
  it('nickname extracted', () => expect(payload.nickname).toBeTruthy());
  it('bio from widget Descripción', () => expect(payload.bio).toBeTruthy());
  it('whatsappPhone extracted', () => expect(payload.whatsappPhone).toBe('605542092'));
  it('photos from wp-content/uploads', () => {
    expect(payload.photos.length).toBeGreaterThan(0);
    expect(payload.photos[0]!.src).toContain('wp-content/uploads');
  });
  it('isVerified = false', () => expect(payload.isVerified).toBe(false));

  it('age from widget Edad', () => expect(payload.age).toBe(22));
  it('nationality from widget Nacionalidad', () =>
    expect(payload.nationality).toBe('española'));
  it('heightCm from widget Altura (1.68 → 168)', () =>
    expect(payload.heightCm).toBe(168));
  it('weightKg from widget Peso', () => expect(payload.weightKg).toBe(65));
  it('languages split from widget Idiomas', () => {
    expect(payload.languages).toContain('español');
    expect(payload.languages).toContain('ingles');
  });
  it('services from widget Servicios', () =>
    expect(payload.services!.length).toBeGreaterThan(0));
  it('rates from widget Tarifa', () => expect(payload.rates).toBeTruthy());
});

describe('extractChicasmalas — fallback og:image', () => {
  it('usa og:image cuando no hay galería', () => {
    const html = `<html><head>
      <meta property="og:title" content="Sofia Escort Madrid">
      <meta property="og:image" content="https://www.chicasmalas.es/wp-content/uploads/sofia.jpg">
    </head><body></body></html>`;
    const p = extractChicasmalas(html, 'https://www.chicasmalas.es/anuncios/sofia-escort/');
    expect(p.photos).toHaveLength(1);
    expect(p.photos[0]!.src).toContain('sofia.jpg');
  });
});

describe('extractChicasmalas — Elementor heading/text-editor pairing', () => {
  it('empareja cada heading con el siguiente widget text-editor', () => {
    const html = `<html><body>
      <div class="elementor-element elementor-widget elementor-widget-heading">
        <h2 class="elementor-heading-title">Edad.</h2>
      </div>
      <div class="elementor-element elementor-widget elementor-widget-text-editor">30</div>
      <div class="elementor-element elementor-widget elementor-widget-heading">
        <h2 class="elementor-heading-title">Nacionalidad.</h2>
      </div>
      <div class="elementor-element elementor-widget elementor-widget-text-editor">Colombiana</div>
    </body></html>`;
    const p = extractChicasmalas(html, 'https://www.chicasmalas.es/anuncios/ana/');
    expect(p.age).toBe(30);
    expect(p.nationality).toBe('Colombiana');
  });
});

describe('extractChicasmalas — minimal HTML', () => {
  it('maneja body vacío sin romper', () => {
    const html = '<html><head></head><body></body></html>';
    const p = extractChicasmalas(html, SOURCE_URL);
    expect(p.sourceId).toBe('sofia-deluxe');
    expect(p.photos).toHaveLength(0);
    expect(p.nickname).toBeUndefined();
    expect(p.age).toBeUndefined();
    expect(p.services).toBeUndefined();
  });
});
