import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const dist = new URL('../dist/', import.meta.url)
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const manifest = JSON.parse(await readFile(new URL('consumer-css-order.json', dist), 'utf8'))
const evidence = {}
for (const [entry, contract] of Object.entries(manifest)) {
  const html = await readFile(new URL(entry, dist), 'utf8')
  const links = html.match(/<link\b[^>]*rel="stylesheet"[^>]*>/g) ?? []
  assert.deepEqual(links, contract.links, `${entry}: emitted HTML matches contract`)
  const assets = await Promise.all(links.map(async (link) => {
    const href = link.match(/href="([^"]+)"/)[1]
    const css = await readFile(new URL(href, dist), 'utf8')
    return { href, css, sha256: sha256(css) }
  }))
  const layered = entry === 'conformance-layered.html'
  const adoptionCount = layered ? 3 : 1
  assert.equal(assets.filter(({ css }) => css.includes('--qds-color-primary:')).length, 1, `${entry}: one token emitter`)
  if (layered) {
    assert(assets[0].css.includes('@layer qds-important,quasar,qds'))
    assert(assets[0].css.includes('@layer quasar{'))
    assert(assets[1].css.includes('@layer qds.quasar{'))
    assert(assets[2].css.includes('@layer qds.quasar{'))
    assert(!assets.some(({ href }) => href.includes('adoption-default')))
  } else {
    const css = assets[0].css
    assert(!css.includes('@layer quasar{'), `${entry}: native CSS remains unlayered`)
    assert(!css.includes('@layer qds.quasar{'), `${entry}: QDS components remain unlayered`)
    const native = css.indexOf('.q-breadcrumbs')
    const qds = css.indexOf('.qds-ui .q-breadcrumbs')
    const extension = css.indexOf('.qds-ui .qds-window')
    assert(native >= 0 && qds > native && extension > qds, `${entry}: native → QDS → window extension`)
  }
  for (const { css } of assets.slice(adoptionCount)) {
    assert(!css.includes('--qds-color-primary:'), `${entry}: author chunk cannot contain adoption tokens`)
  }
  evidence[entry] = {
    htmlSha256: sha256(html),
    sources: await Promise.all(contract.adoptionModules.map(async ([path, chunk]) => ({
      path, chunk, sha256: sha256(await readFile(path)),
    }))),
    assets: assets.map(({ css, ...asset }) => ({ ...asset, bytes: Buffer.byteLength(css) })),
  }
}

// Optional direct browser bounds, against the same production URLs used by CI.
if (process.env.QDS_BASE_URL) {
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch({ headless: true })
  try {
    evidence.browser = []
    for (const width of [1280, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 844 } })
      for (const mode of ['light', 'dark']) {
        await page.goto(`${process.env.QDS_BASE_URL}#forms`)
        await page.waitForFunction(() => window.__qdsGallery)
        await page.evaluate((mode) => {
          window.__qdsGallery.setVariant('fluent')
          window.__qdsGallery.setMode(mode)
        }, mode)
        await page.evaluate(() => document.fonts.ready)
        const title = await page.locator('[data-test="qds-forms-settings-title"]').evaluate((el) => getComputedStyle(el).fontSize)
        assert.equal(title, '28px')
        await page.goto(`${process.env.QDS_BASE_URL}#catalog`)
        await page.locator('[data-test="qds-catalog-color"]').waitFor()
        const pickers = await page.locator('.catalog-picker').evaluateAll((els) => els.map((el) => ({
          test: el.getAttribute('data-test'), width: el.getBoundingClientRect().width,
          maxWidth: getComputedStyle(el).maxWidth,
        })))
        for (const picker of pickers) {
          assert.equal(picker.maxWidth, '336px')
          assert(picker.width >= 290 && picker.width <= 338, JSON.stringify(picker))
        }
        const steppers = await page.locator('[data-test="qds-stepper-horizontal"], [data-test="qds-stepper-vertical"]').evaluateAll((els) => els.map((el) => ({
          test: el.getAttribute('data-test'), radius: getComputedStyle(el).borderRadius,
          dots: [...el.querySelectorAll('.q-stepper__dot')].map((dot) => ({
            color: getComputedStyle(dot).color, background: getComputedStyle(dot).backgroundColor,
            radius: getComputedStyle(dot).borderRadius,
          })),
        })))
        evidence.browser.push({ width, mode, title, pickers, steppers })
      }
      await page.close()
    }
    for (const entry of Object.keys(manifest)) {
      const page = await browser.newPage()
      await page.goto(new URL(entry, process.env.QDS_BASE_URL).href)
      const links = await page.locator('link[rel="stylesheet"]').evaluateAll((els) => els.map((el) => el.getAttribute('href')))
      assert.deepEqual(links, evidence[entry].assets.map(({ href }) => href))
      await page.close()
    }
  } finally {
    await browser.close()
  }
}
console.log(JSON.stringify(evidence, null, 2))
