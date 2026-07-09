export const animation = {
  spring: {
    default: { type: 'spring' as const, stiffness: 300, damping: 30 },
    snappy: { type: 'spring' as const, stiffness: 400, damping: 35 },
    gentle: { type: 'spring' as const, stiffness: 200, damping: 25 },
    slow: { type: 'spring' as const, stiffness: 150, damping: 20 },
  },
  transition: {
    fast: '150ms ease-out',
    normal: '200ms ease-out',
    slow: '300ms ease-out',
  },
  duration: {
    fast: 150,
    normal: 200,
    slow: 300,
  },
} as const;