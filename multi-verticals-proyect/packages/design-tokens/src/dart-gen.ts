import tokens from './tokens.json' with { type: 'json' };

function dartComment(): string {
  return '// Auto-generated from tokens.json — do not edit manually';
}

function dartColor(name: string, value: string): string {
  return `  static const ${name} = Color(0xFF${value.replace('#', '')});`;
}

function dartString(name: string, value: string): string {
  return `  static const ${name} = '${value}';`;
}

function dartNum(name: string, value: string): string {
  return `  static const ${name} = ${value};`;
}

export function generateDart(): string {
  const lines: string[] = [
    dartComment(),
    '',
    "import 'package:flutter/material.dart';",
    '',
    'class Tokens {',
    '  Tokens._();',
    '',
    '  // Brand',
    `  static const brandName = '${tokens.brand.name}';`,
    `  static const brandClaim = '${tokens.brand.claim}';`,
    '',
    '  // --- Colors ---',
    '',
  ];

  // Primary colors
  lines.push('  // Primary');
  for (const [shade, value] of Object.entries(tokens.colors.primary)) {
    lines.push(dartColor(`primary${shade}`, value));
  }

  lines.push('', '  // Secondary');
  for (const [shade, value] of Object.entries(tokens.colors.secondary)) {
    lines.push(dartColor(`secondary${shade}`, value));
  }

  lines.push('', '  // Neutral');
  for (const [shade, value] of Object.entries(tokens.colors.neutral)) {
    lines.push(dartColor(`neutral${shade}`, value));
  }

  // Semantic
  for (const [name, scale] of Object.entries(tokens.colors.semantic)) {
    lines.push('', `  // ${name}`);
    for (const [shade, value] of Object.entries(scale)) {
      lines.push(dartColor(`${name}${shade}`, value));
    }
  }

  // Typography
  lines.push(
    '',
    '  // --- Typography ---',
    '',
    `  static const fontFamilySans = '${tokens.typography.fontFamily.sans[0]}';`,
    `  static const fontFamilyDisplay = '${tokens.typography.fontFamily.display[0]}';`,
    `  static const fontFamilyMono = '${tokens.typography.fontFamily.mono[0]}';`,
  );

  for (const [name, { size, lineHeight }] of Object.entries(
    tokens.typography.fontSize,
  )) {
    lines.push(`  static const fontSize${capitalize(name)} = ${parseFloat(size) * 16}.0;`);
    lines.push(`  static const lineHeight${capitalize(name)} = ${parseFloat(lineHeight) * 16}.0;`);
  }

  // Spacing
  lines.push('', '  // --- Spacing (4px base grid) ---');
  for (const [name, value] of Object.entries(tokens.spacing)) {
    const px = parseFloat(value) * 16;
    const safeName = name === '0' ? 'zero' : name === '2xl' ? 'xxl' : name === '3xl' ? 'xxxl' : name === '4xl' ? 'xxxxl' : name;
    lines.push(`  static const spacing${capitalize(safeName)} = ${px}.0;`);
  }

  // Radius
  lines.push('', '  // --- Radius ---');
  for (const [name, value] of Object.entries(tokens.radius)) {
    lines.push(`  static const radius${capitalize(name)} = ${parseFloat(value) * 16}.0;`);
  }

  // Motion
  lines.push(
    '',
    '  // --- Motion ---',
    '',
    `  static const durationFast = Duration(milliseconds: ${parseInt(tokens.motion.duration.fast)});`,
    `  static const durationBase = Duration(milliseconds: ${parseInt(tokens.motion.duration.base)});`,
    `  static const durationSlow = Duration(milliseconds: ${parseInt(tokens.motion.duration.slow)});`,
    `  static const durationSlower = Duration(milliseconds: ${parseInt(tokens.motion.duration.slower)});`,
  );

  // Breakpoints
  lines.push('', '  // --- Breakpoints ---');
  for (const [name, value] of Object.entries(tokens.breakpoints)) {
    const safeName = name === '2xl' ? 'xxl' : name;
    lines.push(`  static const bp${capitalize(safeName)} = ${parseFloat(value)}.0;`);
  }

  lines.push('}', '');

  return lines.join('\n');
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
