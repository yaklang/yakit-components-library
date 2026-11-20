import { extname, relative, resolve, sep } from 'node:path'

export const CREDENTIAL_PATTERNS = [
  /npm_[A-Za-z0-9]{20,}/,
  /\/\/:_authToken\s*=/i,
  /(?:NPM_TOKEN|NODE_AUTH_TOKEN)\s*[:=]/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
]

export const FORBIDDEN_PACK_PATHS = [
  /(^|\/)\.npmrc$/,
  /(^|\/)\.env(?:\.|$)/,
  /(^|\/)\.omx(?:\/|$)/,
  /(^|\/)\.git(?:hub)?(?:\/|$)/,
  /(^|\/)node_modules(?:\/|$)/,
  /(^|\/)(?:coverage|test-results|playwright-report)(?:\/|$)/,
  /(^|\/)test(?:s)?(?:\/|$)/,
  /(^|\/)\.storybook(?:\/|$)/,
  /(^|\/)pnpm-lock\.yaml$/,
]

export function assertSafePackEntries(entries) {
  const normalized = entries.map((entry) =>
    String(typeof entry === 'string' ? entry : (entry.path ?? entry.name ?? '')).replace(/^package\//, ''),
  )
  const forbidden = normalized.filter((entry) => FORBIDDEN_PACK_PATHS.some((pattern) => pattern.test(entry)))
  if (forbidden.length) throw new Error(`forbidden package paths: ${forbidden.join(', ')}`)
  for (const entry of normalized) {
    if (!/^dist\//.test(entry) && !/^(?:package\.json|README(?:\.md)?|LICENSE(?:\..*)?)$/.test(entry)) {
      throw new Error(`unexpected package path: ${entry}`)
    }
  }
  return normalized
}

export function assertCredentialFree(name, content) {
  for (const pattern of CREDENTIAL_PATTERNS) {
    if (pattern.test(content)) throw new Error(`credential-like content detected in ${name}`)
  }
}

export function resolveStaticAsset(staticRoot, requestPath) {
  let decoded
  try {
    decoded = decodeURIComponent(requestPath.split(/[?#]/, 1)[0])
  } catch {
    throw new Error('malformed URL encoding')
  }
  if (decoded.includes('\0')) throw new Error('NUL byte is forbidden')
  if (decoded.split(/[\\/]/).includes('..')) throw new Error('path traversal is forbidden')
  const root = resolve(staticRoot)
  const candidate = resolve(root, `.${decoded.startsWith('/') ? decoded : `/${decoded}`}`)
  const rel = relative(root, candidate)
  if (rel === '..' || rel.startsWith(`..${sep}`) || rel.includes(`${sep}..${sep}`)) {
    throw new Error('path traversal is forbidden')
  }
  return candidate
}

const MIME_TYPES = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
])

export const contentTypeFor = (file) => MIME_TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream'

export function extractWorkflowJobs(source) {
  const lines = source.split(/\r?\n/)
  const jobsIndex = lines.findIndex((line) => /^jobs:\s*(?:#.*)?$/.test(line))
  if (jobsIndex < 0) throw new Error('workflow has no jobs mapping')
  const jobs = new Map()
  let current
  for (const line of lines.slice(jobsIndex + 1)) {
    if (/^\S/.test(line) && line.trim() && !line.trimStart().startsWith('#')) break
    const job = line.match(/^  ([A-Za-z0-9_-]+):\s*(?:#.*)?$/)
    if (job) {
      current = job[1]
      jobs.set(current, `${line}\n`)
    } else if (current) {
      jobs.set(current, `${jobs.get(current)}${line}\n`)
    }
  }
  return jobs
}

export function thirdPartyActionReferences(source) {
  return [...source.matchAll(/^\s*-?\s*uses:\s*([^\s#]+).*$/gm)].map((match) => match[1])
}

export const isFullShaActionReference = (reference) => {
  if (reference.startsWith('./') || reference.startsWith('docker://')) return true
  const at = reference.lastIndexOf('@')
  return at > 0 && /^[a-f0-9]{40}$/i.test(reference.slice(at + 1))
}
