export const PUBLIC_PACKAGES = [
  "@yakit-libs/yakit-ui",
  "@yakit-libs/yakit-ui-icons",
];

export function assertImpactOutputPublishSafe(result) {
  for (const probe of result?.impactProbeSet ?? []) {
    if (probe.kind !== "impact-probe" || probe.nonPublishable !== true)
      throw new Error("invalid impact probe identity");
    if (
      Object.keys(probe).some(
        (key) =>
          key !== "nonPublishable" && /tarball|filename|tgz|publish/i.test(key),
      )
    )
      throw new Error("impact probe contains publishable artifact fields");
    for (const field of [
      "baseSourceHash",
      "headSourceHash",
      "baseLockHash",
      "headLockHash",
      "baseToolchainHash",
      "headToolchainHash",
      "baseConfigHash",
      "headConfigHash",
      "snapshotHash",
      "toolchainIdentityHash",
    ])
      if (!/^[0-9a-f]{64}$/i.test(probe[field] ?? ""))
        throw new Error(`impact probe ${field} is incomplete`);
    if (
      !/^[0-9a-f]{64}$/i.test(probe.packageSnapshotHashes?.base ?? "") ||
      !/^[0-9a-f]{64}$/i.test(probe.packageSnapshotHashes?.head ?? "") ||
      !probe.toolchainIdentity?.node ||
      !probe.toolchainIdentity?.pnpm ||
      !probe.toolchainIdentity?.os?.platform ||
      !probe.toolchainIdentity?.os?.release ||
      !probe.toolchainIdentity?.os?.arch
    )
      throw new Error("impact probe runtime identity is incomplete");
  }
  return result;
}
