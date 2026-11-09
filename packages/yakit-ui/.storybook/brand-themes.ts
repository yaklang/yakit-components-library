import type { ColorHex, ThemeMode } from '@yakit-libs/color';

// Only the main colors are configured here. @yakit-libs/color derives all other tokens.
export const brandThemes = {
  yakit: { name: 'Yakit', light: '#F17F30', dark: '#F17F30' },
  irify: { name: 'irify', light: '#6A44A9', dark: '#B081FF' },
  memfit: { name: 'memfit', light: '#2E63B3', dark: '#5E9DEA' },
} as const satisfies Record<string, { name: string } & Record<ThemeMode, ColorHex>>;

export type BrandTheme = keyof typeof brandThemes;
