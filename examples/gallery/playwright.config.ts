import { defineConfig, devices } from '@playwright/test'

// Visual verification gate (board T10): proves the design-system overrides
// actually apply on real rendered Quasar components, after Quasar's unlayered
// CSS, across every mode/variant cell. Runs against the *built* gallery via
// `vite preview` so the gate exercises the same artifact a release ships.
const PORT = 4317
const BASE_URL = `http://127.0.0.1:${PORT}/`

export default defineConfig({
  testDir: './tests/visual',
  // The independent oracle has its own explicit two-origin server config.
  testIgnore: ['**/shadcn-reference.spec.ts'],
  // The override-vs-Quasar assertions are deterministic; never retry-mask a gap.
  retries: 0,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  // Screenshot baselines only run inside the pinned Playwright image (`pnpm gallery:screens`).
  grep: process.env.QDS_SCREENS ? /@screens/ : undefined,
  grepInvert: process.env.QDS_SCREENS ? undefined : /@screens/,
  snapshotPathTemplate: '{testDir}/__screens__/{arg}-{projectName}{ext}',
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.002 },
  },
  use: {
    baseURL: process.env.QDS_BASE_URL ?? BASE_URL,
    screenshot: 'only-on-failure',
  },
  // Desktop + mobile viewports; mode × variant are driven inside the spec.
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: process.env.QDS_BASE_URL ? undefined : {
    // Build then preview the production bundle so the gate matches the release.
    command: `pnpm build && pnpm preview --host 127.0.0.1 --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
