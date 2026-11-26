import { readFile } from 'node:fs/promises'
import path from 'node:path'

const SHA1 = /^[0-9a-f]{40}$/i
const SHA256 = /^[0-9a-f]{64}$/i

export function validateCutoverPolicy(policy) {
  if (policy?.schemaId !== 'yakit-ui-release-cutover-policy/v2')
    throw new Error('unsupported release cutover policy schema')
  if (!Number.isFinite(Date.parse(policy.inventoryWindowStartsAt)))
    throw new Error('release cutover inventory window is invalid')
  if (!Number.isFinite(Date.parse(policy.legacyRecoveryEol))) throw new Error('legacy recovery EOL is invalid')
  if (!Array.isArray(policy.refDispositions) || policy.refDispositions.length === 0)
    throw new Error('exact refDispositions must be non-empty')
  if (new Set(policy.refDispositions.map((item) => item.ref)).size !== policy.refDispositions.length)
    throw new Error('refDispositions must not contain duplicate refs')
  for (const item of policy.refDispositions) {
    if (
      !/^refs\/heads\/(?:main|pre\/[A-Za-z0-9._/-]+)$/.test(item?.ref ?? '') ||
      item.ref.includes('*') ||
      !['migrated', 'frozen', 'retired'].includes(item.disposition) ||
      (item.disposition === 'migrated'
        ? item.headBinding !== 'live-producer'
        : !SHA1.test(item.expectedHeadSha ?? '')) ||
      !SHA1.test(item.cutoverRevision ?? '') ||
      item.approval?.approved !== true ||
      !item.approval?.approvedBy ||
      !Number.isFinite(Date.parse(item.approval?.approvedAt)) ||
      !item.approval?.auditArtifact?.path ||
      !SHA1.test(item.approval.auditArtifact.blobSha ?? '') ||
      !SHA256.test(item.approval.auditArtifact.sha256 ?? '')
    )
      throw new Error(`ref disposition is incomplete for ${item?.ref ?? '<unknown>'}`)
  }
  if (!Array.isArray(policy.legacyExactAllowlist)) throw new Error('legacyExactAllowlist must be an array')
  return policy
}

export function dispositionForExactRef(policy, ref) {
  return policy.refDispositions.find((item) => item.ref === ref)
}

export async function readCutoverPolicy(root) {
  return validateCutoverPolicy(
    JSON.parse(await readFile(path.join(root, 'scripts/release/release-cutover-policy.json'), 'utf8')),
  )
}
