export const colors = {
  background: {
    primary: 'rgba(255, 255, 255, 0.04)',
    secondary: 'rgba(255, 255, 255, 0.08)',
    tertiary: 'rgba(255, 255, 255, 0.12)',
  },
  surface: {
    glass: 'rgba(255, 255, 255, 0.06)',
    glassHeavy: 'rgba(255, 255, 255, 0.1)',
    raised: 'rgba(255, 255, 255, 0.15)',
  },
  border: {
    subtle: 'rgba(255, 255, 255, 0.08)',
    default: 'rgba(255, 255, 255, 0.12)',
    strong: 'rgba(255, 255, 255, 0.2)',
  },
  text: {
    primary: 'rgba(255, 255, 255, 0.95)',
    secondary: 'rgba(255, 255, 255, 0.65)',
    tertiary: 'rgba(255, 255, 255, 0.4)',
    inverse: '#0a0a0a',
  },
  accent: {
    blue: '#0a84ff',
    purple: '#5e5ce6',
    pink: '#ff2d55',
    orange: '#ff9f0a',
    green: '#30d158',
    red: '#ff453a',
  },
  blur: {
    heavy: '60px',
    medium: '24px',
    light: '12px',
  },
} as const;