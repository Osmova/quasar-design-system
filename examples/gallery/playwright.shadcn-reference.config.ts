import { defineConfig } from '@playwright/test'
import gallery from './playwright.config'
const referenceUrl = process.env.QDS_SHADCN_REFERENCE_URL ?? 'http://127.0.0.1:4320/'
export default defineConfig(gallery, {
  testMatch: 'shadcn-reference.spec.ts',
  testIgnore: [],
  webServer: [
    ...(gallery.webServer ? (Array.isArray(gallery.webServer) ? gallery.webServer : [gallery.webServer]) : []),
    ...(process.env.QDS_SHADCN_REFERENCE_URL ? [] : [{
      command: 'pnpm -C ../shadcn-reference dev --host 127.0.0.1 --port 4320 --strictPort',
      url: referenceUrl, reuseExistingServer: !process.env.CI, timeout: 120_000,
    }]),
  ],
})
