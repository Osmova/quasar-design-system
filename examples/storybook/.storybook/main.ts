import type { StorybookConfig } from '@storybook/vue3-vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
// Repository root: examples/storybook/.storybook -> examples/storybook -> examples -> repo root.
const repoRoot = path.resolve(here, '../../..')

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.ts'],
  framework: {
    name: '@storybook/vue3-vite',
    options: {},
  },
  addons: ['@storybook/addon-docs'],
  async viteFinal(config) {
    // SB 10's vue3-vite framework only ships `templateCompilation` (vue runtime
    // alias). SFC demo compilation needs @vitejs/plugin-vue explicitly.
    const { default: vuePlugin } = await import('@vitejs/plugin-vue')

    // Storybook's base preview config may ship resolve.alias as an array or an
    // object depending on the installed framework — merge without losing them.
    const baseAlias = config.resolve?.alias
    const baseEntries: Array<{ find: string | RegExp; replacement: string }> = Array.isArray(baseAlias)
      ? baseAlias
      : Object.entries(baseAlias ?? {}).map(([find, replacement]) => ({ find, replacement: String(replacement) }))

    return {
      ...config,
      plugins: [
        ...(config.plugins ?? []),
        vuePlugin(),
      ],
      resolve: {
        ...config.resolve,
        alias: [
          ...baseEntries,
          // The shared catalog lives outside this workspace root on purpose
          // (one copy of demos/control data for both host adapters).
          { find: '@qds-catalog', replacement: path.resolve(repoRoot, 'catalog') },
        ],
      },
      server: {
        ...config.server,
        fs: {
          ...(config.server?.fs ?? {}),
          allow: [
            ...(config.server?.fs?.allow ?? []),
            repoRoot,
          ],
        },
      },
    }
  },
}

export default config
