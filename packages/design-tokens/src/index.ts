import { typography } from './typography';
import { spacing, spacingGrid } from './spacing';
import { radius } from './radius';
import { shadow, blur } from './shadow';
import { animation } from './animation';
import { colors } from './colors';

export { typography, spacing, spacingGrid, radius, shadow, blur, animation, colors };

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