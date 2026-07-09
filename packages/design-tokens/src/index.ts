export { typography } from './typography';
export { spacing, spacingGrid } from './spacing';
export { radius } from './radius';
export { shadow, blur } from './shadow';
export { animation } from './animation';
export { colors } from './colors';

export const designTokens = {
  typography,
  spacing,
  spacingGrid,
  radius,
  shadow,
  blur,
  animation,
  colors,
} as const;

export type DesignTokens = typeof designTokens;