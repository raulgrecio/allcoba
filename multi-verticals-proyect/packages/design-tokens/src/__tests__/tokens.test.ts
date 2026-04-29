import { describe, it, expect } from 'vitest';
import { getTokens } from '../index.js';

describe('tokens', () => {
  const tokens = getTokens();

  describe('brand', () => {
    it('has name and claim', () => {
      expect(tokens.brand.name).toBe('Allcoba');
      expect(tokens.brand.claim).toBeTruthy();
    });
  });

  describe('colors', () => {
    it('has primary palette with 50-950 scale', () => {
      const p = tokens.colors.primary;
      expect(p['50']).toBeTruthy();
      expect(p['500']).toBeTruthy();
      expect(p['950']).toBeTruthy();
      expect(p['500']).toMatch(/^#[0-9a-f]{6}$/i);
    });

    it('has semantic colors', () => {
      expect(tokens.colors.semantic.success['500']).toBeTruthy();
      expect(tokens.colors.semantic.error['500']).toBeTruthy();
      expect(tokens.colors.semantic.warning['500']).toBeTruthy();
      expect(tokens.colors.semantic.info['500']).toBeTruthy();
    });
  });

  describe('typography', () => {
    it('has font families', () => {
      expect(tokens.typography.fontFamily.sans).toBeDefined();
      expect(tokens.typography.fontFamily.display).toBeDefined();
      expect(tokens.typography.fontFamily.mono).toBeDefined();
    });

    it('has font sizes with size and lineHeight', () => {
      const base = tokens.typography.fontSize.base;
      expect(base.size).toBe('1rem');
      expect(base.lineHeight).toBe('1.5rem');
    });

    it('has font weights', () => {
      expect(tokens.typography.fontWeight.normal).toBe('400');
      expect(tokens.typography.fontWeight.bold).toBe('700');
    });
  });

  describe('spacing', () => {
    it('follows 4px base grid', () => {
      expect(tokens.spacing.xs).toBe('0.25rem');
      expect(tokens.spacing.sm).toBe('0.5rem');
      expect(tokens.spacing.md).toBe('1rem');
      expect(tokens.spacing.lg).toBe('1.5rem');
      expect(tokens.spacing.xl).toBe('2rem');
      expect(tokens.spacing['2xl']).toBe('3rem');
    });
  });

  describe('radius', () => {
    it('has standard radius scale', () => {
      expect(tokens.radius.none).toBe('0');
      expect(tokens.radius.sm).toBe('0.25rem');
      expect(tokens.radius.md).toBe('0.5rem');
      expect(tokens.radius.full).toBe('9999px');
    });
  });

  describe('shadows', () => {
    it('has shadow tokens', () => {
      expect(tokens.shadows.sm).toBeTruthy();
      expect(tokens.shadows.md).toBeTruthy();
      expect(tokens.shadows.lg).toBeTruthy();
    });
  });

  describe('motion', () => {
    it('has duration tokens', () => {
      expect(tokens.motion.duration.fast).toBe('100ms');
      expect(tokens.motion.duration.base).toBe('200ms');
      expect(tokens.motion.duration.slow).toBe('300ms');
    });

    it('has easing tokens', () => {
      expect(tokens.motion.easing.default).toContain('cubic-bezier');
    });
  });

  describe('breakpoints', () => {
    it('has standard breakpoints', () => {
      expect(tokens.breakpoints.sm).toBe('640px');
      expect(tokens.breakpoints.md).toBe('768px');
      expect(tokens.breakpoints.lg).toBe('1024px');
    });
  });
});
