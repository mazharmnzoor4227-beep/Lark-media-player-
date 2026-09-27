// src/theme/theme.js
// Central design tokens so every screen/component stays visually consistent.

export const colors = {
  background: '#0B0B0F',
  surface: '#16161C',
  surfaceElevated: '#1F1F27',
  card: 'rgba(255,255,255,0.06)',
  border: 'rgba(255,255,255,0.08)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.6)',
  textTertiary: 'rgba(255,255,255,0.38)',
  accent: '#FF375F', // Lark-style pink/red accent
  accentSecondary: '#6C5CE7',
  success: '#32D74B',
  overlay: 'rgba(0,0,0,0.45)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const typography = {
  largeTitle: { fontSize: 32, fontWeight: '800', letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  headline: { fontSize: 17, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  caption: { fontSize: 13, fontWeight: '400' },
  micro: { fontSize: 11, fontWeight: '500' },
};

// Fallback gradient pairs used before album-art colors are extracted.
export const fallbackGradients = [
  ['#3A1C71', '#0B0B0F'],
  ['#134E5E', '#0B0B0F'],
  ['#654EA3', '#0B0B0F'],
  ['#DA4453', '#0B0B0F'],
  ['#2C3E50', '#0B0B0F'],
];

export function gradientForTrackId(id) {
  if (!id) return fallbackGradients[0];
  const sum = String(id)
    .split('')
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return fallbackGradients[sum % fallbackGradients.length];
}
