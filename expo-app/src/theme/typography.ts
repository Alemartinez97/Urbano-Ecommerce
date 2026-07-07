export const typography = {
  sizes: {
    small: 12,
    body: 16,
    h3: 20,
    h2: 24,
    h1: 32,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    bold: '700' as const,
  },
};

export type TypographyType = typeof typography;
