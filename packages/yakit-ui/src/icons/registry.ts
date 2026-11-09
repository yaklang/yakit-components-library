import { iconRegistry as publicIconRegistry } from '@yakit-libs/yakit-ui-icons/registry';

// Keep the legacy declaration distinct so TypeScript also offers the canonical
// icons/registry import when both packages are direct dependencies.
export const iconRegistry: typeof publicIconRegistry = publicIconRegistry;
export * from '@yakit-libs/yakit-ui-icons/registry';
