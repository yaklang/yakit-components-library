import type { ColorHex, ThemeMode } from '@yakit-libs/color';

import themes from '../../yakit-ui-icons/config/brand-themes.json';

// Shared with the offline icon catalog; the color package derives all other tokens.
export const brandThemes = themes as Record<
  keyof typeof themes,
  { name: string } & Record<ThemeMode, ColorHex>
>;

export type BrandTheme = keyof typeof brandThemes;
