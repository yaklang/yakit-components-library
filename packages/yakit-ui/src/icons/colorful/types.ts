/** Public discovery categories for fixed-, mixed-, and theme-painted colorful icons. */
export type ColorfulIconCategory =
  | 'ai-model'
  | 'avatar'
  | 'basic'
  | 'browser'
  | 'coding'
  | 'cursor'
  | 'file-type'
  | 'log-task-node'
  | 'operating-system'
  | 'penetration-logo'
  | 'plugin-source'
  | 'primary-function-menu'
  | 'risk-level'
  | 'secondary-menu'
  | 'social-media'
  | 'yakit-logo';

/** Whether an icon's visible artwork is fixed, partially themeable, or fully themeable. */
export type ColorfulIconPaintMode = 'literal' | 'mixed' | 'currentColor';
