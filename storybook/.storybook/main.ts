import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import type { StorybookConfig } from '@storybook/react-vite'
import type { Plugin, PluginOption } from 'vite'

// Workspace packages resolve outside node_modules. Treat their generated JS as
// dependency code so react-docgen does not parse multi-megabyte SVG bundles.
async function skipBuiltIconDocgen(option: PluginOption): Promise<PluginOption> {
  const plugin = await option
  if (Array.isArray(plugin)) return Promise.all(plugin.map(skipBuiltIconDocgen))
  if (!plugin || plugin.name !== 'storybook:react-docgen-plugin' || !plugin.transform) return plugin
  const original = plugin.transform
  const handler = typeof original === 'function' ? original : original.handler
  const transform: NonNullable<Plugin['transform']> = function (code, id, ...args) {
    if (id.replaceAll('\\', '/').includes('/yakit-ui-icons/dist/')) return null
    return handler.call(this, code, id, ...args)
  }
  return {
    ...plugin,
    transform: typeof original === 'function' ? transform : { ...original, handler: transform },
  }
}

function packageVersion(name: string): string {
  return JSON.parse(readFileSync(resolve('node_modules/@yakit-libs', name, 'package.json'), 'utf8')).version
}

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.tsx'],
  addons: ['@storybook/addon-essentials', '@storybook/experimental-addon-test'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: async (viteConfig) => ({
    ...viteConfig,
    define: {
      ...viteConfig.define,
      __YAKIT_VERSIONS__: JSON.stringify(
        `UI ${packageVersion('yakit-ui')} · Icons ${packageVersion('yakit-ui-icons')}`,
      ),
    },
    resolve: { ...viteConfig.resolve, dedupe: ['react', 'react-dom'] },
    optimizeDeps: {
      ...viteConfig.optimizeDeps,
      exclude: ['@yakit-libs/yakit-ui', '@yakit-libs/yakit-ui-icons'],
    },
    plugins: await Promise.all((viteConfig.plugins ?? []).map(skipBuiltIconDocgen)),
  }),
}
export default config
