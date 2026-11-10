import { performance } from "node:perf_hooks";
import { setTimeout as sleep } from "node:timers/promises";

export function publicationConfirmationTimeout(environment = process.env) {
  const timeoutMs = Number(
    environment.PUBLICATION_REGISTRY_CONFIRMATION_TIMEOUT_MS ?? 300_000,
  );
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)
    throw new Error(
      "PUBLICATION_REGISTRY_CONFIRMATION_TIMEOUT_MS must be a positive integer",
    );
  return timeoutMs;
}

// Only observe the registry here: an absent version after npm accepts a publish
// is not evidence that it is safe to send another publication request.
export async function waitForPublication({
  release,
  observe,
  timeoutMs = 300_000,
  now = () => performance.now(),
  wait = sleep,
  log = console.log,
}) {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0)
    throw new Error(
      "publication confirmation timeout must be a positive integer",
    );
  const startedAt = now();
  const deadline = startedAt + timeoutMs;
  let delayMs = 1_000;
  for (;;) {
    // Integrity, tag and registry errors still fail closed via observe().
    const observed = await observe(release);
    const elapsedMs = Math.round(now() - startedAt);
    log(
      `${release.identity}: registry=${observed}, elapsed=${elapsedMs}ms, timeout=${timeoutMs}ms`,
    );
    if (observed === "APPLIED") return observed;
    const remainingMs = deadline - now();
    if (remainingMs <= 0) return observed;
    await wait(Math.min(delayMs, remainingMs));
    delayMs = Math.min(delayMs * 2, 15_000);
  }
}
