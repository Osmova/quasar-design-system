import { expect, test, type Page } from '@playwright/test'
import { qdsIconSet } from '../../../../src/icons/quasar-icon-set'
import { FAMILIES, type Section } from './atlas-families'
import { applyTheme, LEGACY_VARIANTS, resolvedColor, type LegacyVariant, type Mode } from './helpers'

const MODES: Mode[] = ['light', 'dark']
const RAW_FILLS = ['rgb(255, 255, 255)', 'rgb(0, 0, 0)']
const SURFACE_TOKENS = ['--qds-surface-0', '--qds-surface-1', '--qds-surface-2', '--qds-bg-layer', '--qds-chat-bubble-bg']
const MATERIAL_GLYPHS = '[class*="material-icons"], [class*="material-symbols"]'
const byHook = (hook: string) => `[data-test="${hook}"]`

type Pseudo = { owner: string; pseudo: string; content: string; display: string; borders: number }

// A pseudo-element draws a Material tail/connector only when it renders and carries a border.
const drawsBorderShape = (entry: Pseudo) => entry.display !== 'none' && entry.content !== 'none' && entry.borders > 0

async function pseudos(page: Page, selector: string, pseudo: '::before' | '::after'): Promise<Pseudo[]> {
  return page.locator(selector).evaluateAll(
    (elements, pseudo) =>
      elements.map((element) => {
        const style = getComputedStyle(element, pseudo)
        const borders = ['Top', 'Right', 'Bottom', 'Left'].reduce(
          (sum, side) => sum + Number.parseFloat(style.getPropertyValue(`border-${side.toLowerCase()}-width`)),
          0,
        )
        return { owner: element.className, pseudo, content: style.content, display: style.display, borders }
      }),
    pseudo,
  )
}

async function backgrounds(page: Page, selector: string): Promise<string[]> {
  return page.locator(selector).evaluateAll((elements) => elements.map((element) => getComputedStyle(element).backgroundColor))
}

async function openSection(page: Page, section: Section, mode: Mode, variant: LegacyVariant) {
  await page.goto(`./#${section}`)
  await applyTheme(page, mode, variant)
}

test.describe('sub-element lint', () => {
  for (const [variant, mode] of LEGACY_VARIANTS.flatMap((variant) => MODES.map((mode) => [variant, mode] as const))) {
    test(`atlas families render unique hooks and no Material glyphs (${mode}/${variant})`, async ({ page }) => {
      for (const section of Object.keys(FAMILIES) as Section[]) {
        await openSection(page, section, mode, variant)
        for (const hook of Object.values(FAMILIES[section]).flat()) {
          const target = page.locator(byHook(hook))
          await expect(target, `${hook} is rendered exactly once`).toHaveCount(1)
          await expect.soft(target.locator(MATERIAL_GLYPHS), `${hook} carries no Material ligature icon`).toHaveCount(0)
        }
      }
    })

    test(`chat tails, tree connectors, caret icons and surface fills drop Material tells (${mode}/${variant})`, async ({ page }) => {
      await openSection(page, 'catalog', mode, variant)

      const bubbles = `${byHook('qds-chat-sent')} .q-message-text, ${byHook('qds-chat-received')} .q-message-text`
      await expect(page.locator(bubbles).first()).toBeAttached()
      for (const entry of [...(await pseudos(page, bubbles, '::before')), ...(await pseudos(page, bubbles, '::after'))]) {
        expect.soft(drawsBorderShape(entry), `${entry.owner}${entry.pseudo} draws no bubble tail`).toBe(false)
      }

      const trees = [byHook('qds-tree-primary'), byHook('qds-tree-dense')]
      for (const tree of trees) {
        await expect(page.locator(`${tree} .q-tree__node-header`).first()).toBeAttached()
        const connectors = [
          ...(await pseudos(page, `${tree} .q-tree__node`, '::after')),
          ...(await pseudos(page, `${tree} .q-tree__node-header`, '::before')),
          ...(await pseudos(page, `${tree} .q-tree__node-body`, '::after')),
        ]
        for (const entry of connectors) {
          expect.soft(entry.display === 'none' || entry.content === 'none', `${tree} ${entry.owner}${entry.pseudo} hides the L-connector`).toBe(true)
        }
        // The only guide QDS draws is a filled straight line, never a bordered elbow.
        for (const entry of await pseudos(page, `${tree} .q-tree__children`, '::before')) {
          expect.soft(entry.borders, `${tree} indent guide has no connector borders`).toBe(0)
        }
      }

      const [paths, viewBox] = qdsIconSet.tree.icon.split('|')
      const caretPath = paths.split('&&')[0].split('@@')[0]
      const arrows = await page.locator(trees.map((tree) => `${tree} .q-tree__arrow`).join(', ')).evaluateAll((elements) =>
        elements.map((element) => ({
          text: element.textContent?.trim() ?? '',
          viewBox: element.querySelector('svg')?.getAttribute('viewBox') ?? '',
          path: element.querySelector('path')?.getAttribute('d') ?? '',
        })),
      )
      expect(arrows.length, 'tree renders expand arrows').toBeGreaterThan(0)
      for (const arrow of arrows) {
        expect.soft(arrow, 'tree arrow is the icon-set caret, not the play triangle').toEqual({ text: '', viewBox, path: caretPath })
      }

      const tokenFills = await Promise.all(SURFACE_TOKENS.map((token) => resolvedColor(page, token)))
      const rawFills = RAW_FILLS.filter((fill) => !tokenFills.includes(fill))
      const fills = [bubbles, ...trees, ...trees.map((tree) => `${tree} .q-tree__node-header`)]
      for (const selector of fills) {
        for (const background of await backgrounds(page, selector)) {
          expect.soft(rawFills, `${selector} background ${background} is a token, not raw white/black`).not.toContain(background)
        }
      }
    })

    test(`icon and selection size tokens resolve (${mode}/${variant})`, async ({ page }) => {
      await openSection(page, 'catalog', mode, variant)
      const sizes = await page.locator('.qds-ui').first().evaluate((root) => {
        const probe = document.createElement('span')
        probe.style.display = 'block'
        root.append(probe)
        const measure = (value: string) => {
          probe.style.width = value
          return getComputedStyle(probe).width
        }
        const result = {
          md: measure('var(--qds-icon-size-md)'),
          controlMd: measure('var(--qds-control-icon-size-md)'),
          selection: measure('var(--qds-selection-inner-size)'),
        }
        probe.remove()
        return result
      })
      expect(sizes).toEqual({ md: '16px', controlMd: '16px', selection: '20px' })
    })
  }
})
