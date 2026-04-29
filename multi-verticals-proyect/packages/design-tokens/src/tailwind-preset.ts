import tokens from './tokens.json' with { type: 'json' };

function buildColorScale(
  scale: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [shade, value] of Object.entries(scale)) {
    result[shade] = value;
  }
  return result;
}

interface FontSizeEntry {
  size: string;
  lineHeight: string;
}

function buildFontSizes(
  sizes: Record<string, FontSizeEntry>,
): Record<string, [string, { lineHeight: string }]> {
  const result: Record<string, [string, { lineHeight: string }]> = {};
  for (const [name, entry] of Object.entries(sizes)) {
    result[name] = [entry.size, { lineHeight: entry.lineHeight }];
  }
  return result;
}

function buildShadowMap(
  shadows: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(shadows)) {
    result[name] = value;
  }
  return result;
}

function buildRadiusMap(
  radius: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(radius)) {
    if (name === 'full') {
      result[name] = '9999px';
    } else {
      result[name] = value;
    }
  }
  return result;
}

const preset = {
  theme: {
    extend: {
      colors: {
        primary: buildColorScale(tokens.colors.primary),
        secondary: buildColorScale(tokens.colors.secondary),
        neutral: buildColorScale(tokens.colors.neutral),
        success: buildColorScale(tokens.colors.semantic.success),
        error: buildColorScale(tokens.colors.semantic.error),
        warning: buildColorScale(tokens.colors.semantic.warning),
        info: buildColorScale(tokens.colors.semantic.info),
      },
      fontFamily: {
        sans: tokens.typography.fontFamily.sans,
        display: tokens.typography.fontFamily.display,
        mono: tokens.typography.fontFamily.mono,
      },
      fontSize: buildFontSizes(tokens.typography.fontSize as Record<string, FontSizeEntry>),
      fontWeight: {
        normal: tokens.typography.fontWeight.normal,
        medium: tokens.typography.fontWeight.medium,
        semibold: tokens.typography.fontWeight.semibold,
        bold: tokens.typography.fontWeight.bold,
      },
      spacing: {
        xs: tokens.spacing.xs,
        sm: tokens.spacing.sm,
        md: tokens.spacing.md,
        lg: tokens.spacing.lg,
        xl: tokens.spacing.xl,
        '2xl': tokens.spacing['2xl'],
        '3xl': tokens.spacing['3xl'],
        '4xl': tokens.spacing['4xl'],
      },
      borderRadius: buildRadiusMap(tokens.radius),
      boxShadow: buildShadowMap(tokens.shadows),
      screens: {
        sm: tokens.breakpoints.sm,
        md: tokens.breakpoints.md,
        lg: tokens.breakpoints.lg,
        xl: tokens.breakpoints.xl,
        '2xl': tokens.breakpoints['2xl'],
      },
      transitionDuration: {
        fast: tokens.motion.duration.fast,
        base: tokens.motion.duration.base,
        slow: tokens.motion.duration.slow,
        slower: tokens.motion.duration.slower,
      },
      transitionTimingFunction: {
        DEFAULT: tokens.motion.easing.default,
        in: tokens.motion.easing.in,
        out: tokens.motion.easing.out,
      },
    },
  },
};

export default preset;
