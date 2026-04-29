import tokens from './tokens.json' with { type: 'json' };

type ColorScale = Record<string, string>;
type SemanticColor = Record<string, Record<string, string>>;

function flattenColors(
  colors: Record<string, ColorScale>,
): string[] {
  const props: string[] = [];

  for (const [name, scale] of Object.entries(colors)) {
    for (const [shade, value] of Object.entries(scale)) {
      props.push(`  --color-${name}-${shade}: ${value};`);
    }
  }

  return props;
}

function flattenSemantic(
  semantic: SemanticColor,
): string[] {
  const props: string[] = [];

  for (const [name, scale] of Object.entries(semantic)) {
    for (const [shade, value] of Object.entries(scale)) {
      props.push(`  --color-${name}-${shade}: ${value};`);
    }
  }

  return props;
}

function generateFontSizeVars(): string[] {
  const props: string[] = [];

  for (const [name, { size, lineHeight }] of Object.entries(
    tokens.typography.fontSize,
  )) {
    props.push(`  --font-size-${name}: ${size};`);
    props.push(`  --line-height-${name}: ${lineHeight};`);
  }

  return props;
}

export function generateCSS(): string {
  const lines: string[] = [
    '/* Auto-generated from tokens.json — do not edit manually */',
    '',
    ':root {',
    '',
    '  /* Brand */',
    `  --brand-name: "${tokens.brand.name}";`,
    `  --brand-claim: "${tokens.brand.claim}";`,
    '',
    '  /* Primary */',
    ...flattenColors({ primary: tokens.colors.primary }),
    '',
    '  /* Secondary */',
    ...flattenColors({ secondary: tokens.colors.secondary }),
    '',
    '  /* Neutral */',
    ...flattenColors({ neutral: tokens.colors.neutral }),
    '',
    '  /* Semantic */',
    ...flattenSemantic(tokens.colors.semantic),
    '',
    '  /* Typography */',
    `  --font-sans: ${tokens.typography.fontFamily.sans.join(', ')};`,
    `  --font-display: ${tokens.typography.fontFamily.display.join(', ')};`,
    `  --font-mono: ${tokens.typography.fontFamily.mono.join(', ')};`,
    ...generateFontSizeVars(),
    '',
    '  /* Font weights */',
    `  --font-weight-normal: ${tokens.typography.fontWeight.normal};`,
    `  --font-weight-medium: ${tokens.typography.fontWeight.medium};`,
    `  --font-weight-semibold: ${tokens.typography.fontWeight.semibold};`,
    `  --font-weight-bold: ${tokens.typography.fontWeight.bold};`,
    '',
    '  /* Spacing (4px base grid) */',
    `  --spacing-0: ${tokens.spacing['0']};`,
    `  --spacing-px: ${tokens.spacing.px};`,
    `  --spacing-xs: ${tokens.spacing.xs};`,
    `  --spacing-sm: ${tokens.spacing.sm};`,
    `  --spacing-md: ${tokens.spacing.md};`,
    `  --spacing-lg: ${tokens.spacing.lg};`,
    `  --spacing-xl: ${tokens.spacing.xl};`,
    `  --spacing-2xl: ${tokens.spacing['2xl']};`,
    `  --spacing-3xl: ${tokens.spacing['3xl']};`,
    `  --spacing-4xl: ${tokens.spacing['4xl']};`,
    '',
    '  /* Radius */',
    `  --radius-none: ${tokens.radius.none};`,
    `  --radius-sm: ${tokens.radius.sm};`,
    `  --radius-md: ${tokens.radius.md};`,
    `  --radius-lg: ${tokens.radius.lg};`,
    `  --radius-xl: ${tokens.radius.xl};`,
    `  --radius-full: ${tokens.radius.full};`,
    '',
    '  /* Shadows */',
    `  --shadow-sm: ${tokens.shadows.sm};`,
    `  --shadow-md: ${tokens.shadows.md};`,
    `  --shadow-lg: ${tokens.shadows.lg};`,
    `  --shadow-xl: ${tokens.shadows.xl};`,
    '',
    '  /* Motion */',
    `  --duration-fast: ${tokens.motion.duration.fast};`,
    `  --duration-base: ${tokens.motion.duration.base};`,
    `  --duration-slow: ${tokens.motion.duration.slow};`,
    `  --duration-slower: ${tokens.motion.duration.slower};`,
    `  --ease-default: ${tokens.motion.easing.default};`,
    `  --ease-in: ${tokens.motion.easing.in};`,
    `  --ease-out: ${tokens.motion.easing.out};`,
    '',
    '  /* Breakpoints */',
    `  --bp-sm: ${tokens.breakpoints.sm};`,
    `  --bp-md: ${tokens.breakpoints.md};`,
    `  --bp-lg: ${tokens.breakpoints.lg};`,
    `  --bp-xl: ${tokens.breakpoints.xl};`,
    `  --bp-2xl: ${tokens.breakpoints['2xl']};`,
    '}',
    '',
  ];

  return lines.join('\n');
}
