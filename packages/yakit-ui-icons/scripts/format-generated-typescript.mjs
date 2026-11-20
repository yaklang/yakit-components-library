import { format } from 'prettier';

// The isolated icon package must produce the same files without a workspace config.
export function formatGeneratedTypeScript(source, filepath) {
  return format(source, { filepath, printWidth: 120, semi: false, singleQuote: true });
}
