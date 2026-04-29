import { describe, it, expect } from 'vitest';
import { generateCSS } from '../css-gen.js';
import { generateDart } from '../dart-gen.js';

describe('generateCSS', () => {
  const css = generateCSS();

  it('starts with a warning comment', () => {
    expect(css).toContain('Auto-generated from tokens.json');
  });

  it('wraps tokens in :root', () => {
    expect(css).toContain(':root {');
    expect(css).toContain('}');
  });

  it('has primary color vars', () => {
    expect(css).toContain('--color-primary-500: #6366f1;');
    expect(css).toContain('--color-primary-50: #eef2ff;');
  });

  it('has semantic color vars', () => {
    expect(css).toContain('--color-success-500: #22c55e;');
    expect(css).toContain('--color-error-500: #ef4444;');
  });

  it('has font family vars', () => {
    expect(css).toContain('Inter');
    expect(css).toContain('--font-sans:');
  });

  it('has spacing tokens (4px grid)', () => {
    expect(css).toContain('--spacing-xs: 0.25rem;');
    expect(css).toContain('--spacing-md: 1rem;');
  });

  it('has motion tokens', () => {
    expect(css).toContain('--duration-base: 200ms;');
    expect(css).toContain('--ease-default:');
  });
});

describe('generateDart', () => {
  const dart = generateDart();

  it('starts with a warning comment', () => {
    expect(dart).toContain('Auto-generated from tokens.json');
    expect(dart).toContain('do not edit manually');
  });

  it('defines Tokens class', () => {
    expect(dart).toContain('class Tokens {');
  });

  it('imports Flutter material', () => {
    expect(dart).toContain("import 'package:flutter/material.dart';");
  });

  it('has color constants', () => {
    expect(dart).toContain('static const primary500 = Color(0xFF6366f1);');
    expect(dart).toContain('static const success500 = Color(0xFF22c55e);');
  });

  it('has spacing constants', () => {
    expect(dart).toContain('static const spacingXs = 4.0;');
    expect(dart).toContain('static const spacingMd = 16.0;');
  });

  it('has motion durations', () => {
    expect(dart).toContain('static const durationBase = Duration(milliseconds: 200);');
    expect(dart).toContain('static const durationFast = Duration(milliseconds: 100);');
  });
});
