import { format } from 'prettier'

// The isolated icon package must produce the same files without a workspace config.
export function formatGeneratedFile(source, filepath) {
  return format(source, { filepath, printWidth: 120, semi: false, singleQuote: true })
}
