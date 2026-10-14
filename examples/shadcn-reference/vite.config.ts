import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const local = (path: string) => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  root: local('./'),
  base: './',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: [
      { find: '@lucide/vue', replacement: local('./src/icons.ts') },
      { find: '@/lib/utils', replacement: local('./upstream/apps/v4/lib/utils.ts') },
      { find: '@/registry/new-york-v4', replacement: local('./upstream/apps/v4/registry/new-york-v4') },
    ],
  },
  server: {
    // Local font files only; this does not load QDS CSS or its runtime.
    fs: { allow: [local('./'), local('../../src/fonts')] },
  },
  build: { outDir: 'dist', emptyOutDir: true },
})
