#!/usr/bin/env node
/**
 * Catalog fixture/inventory generator (T185 bounded proof — development only).
 *
 * Deterministic by design:
 * - parses the INSTALLED quasar source (`node_modules/quasar/src/components.js`) every run;
 * - classifies every export with an explicit, disjoint disposition (mixin / helper /
 *   composite-child / spinner / core), failing hard on unknown names so a Quasar upgrade
 *   forces an explicit decision instead of silently inventing coverage;
 * - derives case coverage from `catalog/manifest.json` (single source: the case list);
 * - machine-verifies the gallery atlas hook inventory (kept as a reference count only —
 *   atlas hooks are a different inventory from native exports and are never equated with them);
 * - writes fixture + inventory + proof-status files as stable JSON (sorted keys, no timestamps).
 *
 * Outputs: catalog/native-inventory.json, catalog/fixtures/*.fixture.json, catalog/proof-status.json
 *
 * This script is not part of the published package.
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url))
const CATALOG_DIR = (root = REPO_ROOT) => path.join(root, 'catalog')
const FIXTURES_DIR = (root = REPO_ROOT) => path.join(root, 'catalog', 'fixtures')
const QUASAR_COMPONENTS_SRC = (root = REPO_ROOT) => path.join(root, 'node_modules', 'quasar', 'src', 'components.js')
const ATLAS_FAMILIES_SRC = (root = REPO_ROOT) => path.join(root, 'examples', 'gallery', 'tests', 'visual', 'atlas-families.ts')

// ---------------------------------------------------------------------------
// Explicit native classification — disjoint groups; every quasar export must
// be listed exactly once. Quasar adds borrow names: update here explicitly.
// ---------------------------------------------------------------------------
const MIXINS = Object.freeze(['QFormChildMixin'])

const HELPERS = Object.freeze([
  // Invisible / structural helpers: explicit no-own-demo disposition.
  'QNoSsr',
  'QSlideTransition',
  'QSpace',
  'QResizeObserver',
  'QScrollObserver',
  'QIntersection',
   'QResponsive',
])

const COMPOSITE_CHILDREN = Object.freeze(new Map([
  // Native export -> owning parent (explicit per coverage contract, incl.
  // QStepperNavigation and QUploaderAddTrigger which must be named there).
  ['QBreadcrumbsEl', 'QBreadcrumbs'],
  ['QCardSection', 'QCard'],
  ['QCardActions', 'QCard'],
  ['QCarouselSlide', 'QCarousel'],
  ['QCarouselControl', 'QCarousel'],
  ['QFabAction', 'QFab'],
  ['QItem', 'QList'],
  ['QItemSection', 'QItem'],
  ['QItemLabel', 'QList'],
  ['QTh', 'QTable'],
  ['QTr', 'QTable'],
  ['QTd', 'QTable'],
  ['QTab', 'QTabs'],
  ['QRouteTab', 'QTabs'],
  ['QTabPanel', 'QTabPanels'],
  ['QStep', 'QStepper'],
  ['QStepperNavigation', 'QStepper'],
  ['QTimelineEntry', 'QTimeline'],
  ['QUploaderAddTrigger', 'QUploader'],
]))

const VISUAL_PLUGINS = Object.freeze(['Dialog', 'Notify', 'BottomSheet', 'Loading', 'LoadingBar'])

const CORE = new Set(`QAjaxBar QAvatar QBadge QBanner QBar QBreadcrumbs QBtn QBtnDropdown QBtnGroup QBtnToggle QCard QCarousel QChatMessage QCheckbox QChip QCircularProgress QColor QDate QDialog QDrawer QEditor QExpansionItem QFab QField QFile QFooter QForm QHeader QIcon QImg QInfiniteScroll QInnerLoading QInput QList QKnob QLayout QLinearProgress QMarkupTable QMenu QOptionGroup QPage QPageContainer QPageScroller QPageSticky QPagination QParallax QPopupEdit QPopupProxy QPullToRefresh QRadio QRange QRating QScrollArea QSelect QSeparator QSkeleton QSlideItem QSlider QSplitter QStepper QTabPanels QTable QTabs QTime QTimeline QToggle QToolbar QToolbarTitle QTooltip QTree QUploader QVideo QVirtualScroll`.split(' '))
const SPINNERS = new Set(`QSpinner QSpinnerAudio QSpinnerBall QSpinnerBars QSpinnerBox QSpinnerClock QSpinnerComment QSpinnerCube QSpinnerDots QSpinnerFacebook QSpinnerGears QSpinnerGrid QSpinnerHearts QSpinnerHourglass QSpinnerInfinity QSpinnerIos QSpinnerOrbit QSpinnerOval QSpinnerPie QSpinnerPuff QSpinnerRadio QSpinnerRings QSpinnerTail`.split(' '))

// ---------------------------------------------------------------------------
// Live-source parsing
// ---------------------------------------------------------------------------
export function parseQuasarComponentExports(source) {
  const pattern = /export \{ default as (\w+) \} from '([^']+)'/g
  const entries = []
  const seen = new Set()

  let match = pattern.exec(source)
  while (match !== null) {
    const name = match[1]
    if (seen.has(name)) {
      throw new Error(`Duplicate export in quasar components.js: ${name}`)
    }
    seen.add(name)
    entries.push({ name, sourcePath: match[2] })
    match = pattern.exec(source)
  }

  if (entries.length === 0) {
    throw new Error('No `export { default as X }` lines parsed from quasar components.js')
  }

  return entries
}

export function classifyExport(name) {
  if (MIXINS.includes(name)) {
    return { disposition: 'mixin', reason: 'Quasar internal form child mixin; consumes native QForm semantics, no visual surface.' }
  }
  if (HELPERS.includes(name)) {
    return { disposition: 'helper', reason: 'Structural/behavior helper with no independent visual skin; QResponsive owns aspect-ratio layout, QIntersection visibility, transitions/observers/spacing retain native behavior. Not visual coverage.' }
  }
  if (COMPOSITE_CHILDREN.has(name)) {
    const parent = COMPOSITE_CHILDREN.get(name)
    return { disposition: 'composite-child', parent, reason: `Composite child of ${parent}; requires an explicit rendered export in an implemented case, not inferred parent coverage.` }
  }
  if (SPINNERS.has(name)) {
    return { disposition: 'spinner', reason: 'Member of the QSpinner family grid (deliberate single-grid disposition; one family case).' }
  }
  if (CORE.has(name)) {
    return { disposition: 'core', reason: 'Core visual component awaiting its named case; honestly planned, not pretended covered.' }
  }
  throw new Error(`Unclassified native export: ${name}; update the explicit disposition registry`)
}

// ---------------------------------------------------------------------------
// Shared reads
// ---------------------------------------------------------------------------
export function readManifest(rootDir = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(rootDir, 'catalog', 'manifest.json'), 'utf8'))
}

export function readControl(rootDir = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(rootDir, 'catalog', 'control.json'), 'utf8'))
}

export function readQuasarSource(rootDir = REPO_ROOT) {
  return readFileSync(QUASAR_COMPONENTS_SRC(rootDir), 'utf8')
}

export function readQuasarVersion(rootDir = REPO_ROOT) {
  const pkg = JSON.parse(readFileSync(path.join(rootDir, 'node_modules', 'quasar', 'package.json'), 'utf8'))
  return pkg.version
}

export function countAtlasHooks(rootDir = REPO_ROOT) {
  const text = readFileSync(ATLAS_FAMILIES_SRC(rootDir), 'utf8')
  const ids = [...text.matchAll(/'([a-z0-9-]+)'/g)].map((entry) => entry[1])
  // Section names ('components'|'forms'|'apps'|'catalog'|'plugins') are not hook ids.
  const sectionNames = new Set(['components', 'forms', 'apps', 'catalog', 'plugins'])
  const hookIds = new Set(ids.filter((id) => id.startsWith('qds-') && !sectionNames.has(id)))
  return { file: 'examples/gallery/tests/visual/atlas-families.ts', uniqueHookIds: hookIds.size }
}

// ---------------------------------------------------------------------------
// Deterministic serialization
// ---------------------------------------------------------------------------
function sortObjectDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortObjectDeep)
  }
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value).sort()) {
      out[key] = sortObjectDeep(value[key])
    }
    return out
  }
  return value
}

export function stableStringify(value) {
  return JSON.stringify(sortObjectDeep(value), null, 2) + '\n'
}

// ---------------------------------------------------------------------------
// Generators (pure — no fs writes inside)
// ---------------------------------------------------------------------------
export function buildNativeInventory(manifest, quasarVersion, sourceText, atlasStats = countAtlasHooks()) {
  const parsed = parseQuasarComponentExports(sourceText)
  const names = parsed.map((entry) => entry.name).sort()

  const implementedExports = new Set(manifest.cases.filter((single) => single.disposition === 'implemented').flatMap((single) => single.nativeExports))
  const unknownCaseExports = [...implementedExports].filter((name) => !names.includes(name))
  if (unknownCaseExports.length > 0) {
    throw new Error(`manifest case nativeExports reference unknown quasar exports: ${unknownCaseExports.join(', ')}`)
  }

  const counts = {
    exports: names.length,
    mixins: 0,
    helpers: 0,
    compositeChildren: 0,
    spinners: 0,
    core: 0,
    pluginsVisual: VISUAL_PLUGINS.length,
    optionalModules: 1,
  }

  const exports = parsed
    .map((entry) => {
      const { disposition, parent, reason } = classifyExport(entry.name)
      counts[disposition === 'mixin' ? 'mixins'
        : disposition === 'composite-child' ? 'compositeChildren'
        : disposition === 'spinner' ? 'spinners'
        : disposition === 'helper' ? 'helpers'
        : 'core'] += 1

      const coveredDirect = implementedExports.has(entry.name)
      const proofStatus = disposition === 'mixin' || disposition === 'helper'
        ? 'helper-no-op'
        : coveredDirect ? 'covered'
        : 'planned'

      const coverageNote = coveredDirect
        ? ' Covered directly by an implemented proof case.'
        : ''

      return {
        name: entry.name,
        sourcePath: entry.sourcePath,
        role: disposition === 'mixin' ? 'mixin' : 'component',
        disposition,
        parent: parent ?? null,
        proofStatus,
        reason: reason + coverageNote,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const totalPartition = counts.mixins + counts.helpers + counts.compositeChildren + counts.spinners + counts.core
  if (totalPartition !== counts.exports) {
    throw new Error(`Classification partition sums to ${totalPartition} but exports count is ${counts.exports}`)
  }
  if (new Set(exports.map((entry) => entry.name)).size !== exports.length) {
    throw new Error('Duplicate export rows produced')
  }

  const plannedByFamily = {}
  for (const entry of exports) {
    if (entry.proofStatus !== 'planned') {
      continue
    }
    const family = entry.disposition === 'spinner'
      ? 'spinner-family-grid'
      : entry.disposition === 'composite-child'
        ? `composite-children-of:${entry.parent}`
        : 'core-components'
    ;(plannedByFamily[family] ??= []).push(entry.name)
  }

  return {
    schemaVersion: 1,
    title: 'QDS native export inventory (bounded proof)',
    source: {
      module: 'quasar',
      version: quasarVersion,
      file: 'node_modules/quasar/src/components.js',
      parsingRule: 'every `export { default as X }` line is one entry; each line is unique',
      sourceSha256: createHash('sha256').update(sourceText).digest('hex'),
    },
    counts,
    proofCases: manifest.cases.map((single) => ({
      id: single.id,
      family: single.family,
      nativeExports: [...single.nativeExports].sort(),
      disposition: single.disposition,
    })),
    coveredByImplementedCases: [...implementedExports].sort(),
    plannedByFamily,
    exports,
    visualPlugins: VISUAL_PLUGINS.map((name) => ({
      name,
      disposition: 'visual-plugin',
      proofStatus: 'planned',
      reason: 'Visual plugin outside the native component exports; portal/plugin families require explicit cases in the full catalog, not in this proof.',
    })),
    optionalModules: [
      {
        name: 'QWindow',
        package: '@quasar/quasar-ui-qwindow',
        proofStatus: 'optional-separate',
        reason: 'Optional opt-in module shipped through the ./qwindow export; intentionally excluded from the native export count and proven separately.',
      },
    ],
    references: {
      atlasHookInventory: {
        ...atlasStats,
        role: 'Gallery atlas visual hooks are a different inventory from native exports; recorded for drift observability only, never equated with the native count.',
      },
    },
    pendingClassificationNotes: [
      'Non-visual directives/plugins (Ripple, AppFullscreen, LocalStorage, Screen, ...) are outside the bounded proof and NOT presented as covered.',
    ],
  }
}

export function buildFixtures(manifest, control) {
  if (control.kinds === undefined) {
    throw new Error('control.json is missing the kinds registry')
  }

  const result = []
  for (const singleCase of manifest.cases) {
    const rows = control.cases[singleCase.id]
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(`control.json has no rows for case ${singleCase.id}`)
    }

    const missing = singleCase.controls.filter((key) => !rows.some((row) => row.key === key))
    if (missing.length > 0) {
      throw new Error(`control.json is missing control keys for case ${singleCase.id}: ${missing.join(', ')}`)
    }

    const extra = rows.filter((row) => !singleCase.controls.includes(row.key))
    if (extra.length > 0) {
      throw new Error(`control.json has control keys not declared by case ${singleCase.id}: ${extra.map((row) => row.key).join(', ')}`)
    }

    const defaults = {}
    for (const row of rows) {
      defaults[row.key] = row.default
      if ((row.kind === 'select') !== Array.isArray(row.options)) {
        throw new Error(`control row ${singleCase.id}/${row.key}: kind select requires options (and other kinds reject them)`)
      }
      if (row.kind === 'select' && !row.options.includes(row.default)) {
        throw new Error(`control row ${singleCase.id}/${row.key}: default must be one of options`)
      }
    }

    result.push({
      case: singleCase.id,
      fixtures: {
        defaults,
        freshStateGuarantee: 'hosts re-init this exact defaults object per variant/story mount; a running story never shares mutable state with another case',
        assertedSubelements: [...singleCase.subelements].sort(),
        controls: rows.map((row) => ({
          key: row.key,
          kind: row.kind,
          subelement: row.subelement,
          semantics: row.semantics,
        })),
      },
    })
  }
  return result
}

export function buildProofStatus(manifest, inventory, quasarVersion) {
  const plannedCount = inventory.exports.filter((row) => row.proofStatus === 'planned').length

  return {
    schemaVersion: 1,
    proofCases: manifest.cases.map((single) => ({
      id: single.id,
       implemented: single.disposition === 'implemented',
       note: 'Source implementation disposition only, not a browser-mount receipt; remaining exports stay explicitly planned',
    })),
    inventory: {
      sourceVersion: quasarVersion,
      counts: inventory.counts,
      coveredByImplementedCases: inventory.coveredByImplementedCases,
    },
    completeGate: {
      expectedCurrentOutcome: 'catalog-check --complete exits 1 while planned exports remain; passes only once every planned row gains a real case',
      plannedExports: plannedCount,
    },
  }
}

export function generateAll(rootDir = REPO_ROOT) {
  const manifest = readManifest(rootDir)
  const control = readControl(rootDir)
  const quasarVersion = readQuasarVersion(rootDir)
  const sourceText = readQuasarSource(rootDir)
  const atlasStats = countAtlasHooks(rootDir)

  const inventory = buildNativeInventory(manifest, quasarVersion, sourceText, atlasStats)
  const inventoryText = stableStringify(inventory)

  const fixtures = buildFixtures(manifest, control)
  const fixtureFiles = fixtures.map((fixture) => ({
    fileSafe: fixture.case.replaceAll('/', '-'),
    text: stableStringify(fixture),
  }))

  const statusText = stableStringify(buildProofStatus(manifest, inventory, quasarVersion))

  return { manifest, control, inventory, inventoryText, fixtureFiles, statusText, quasarVersion }
}

export function writeGenerated(rootDir = REPO_ROOT, generated = generateAll(rootDir)) {
  writeFileSync(path.join(CATALOG_DIR(rootDir), 'native-inventory.json'), generated.inventoryText)
  mkdirSync(FIXTURES_DIR(rootDir), { recursive: true })
  for (const fixture of generated.fixtureFiles) {
    writeFileSync(path.join(FIXTURES_DIR(rootDir), `${fixture.fileSafe}.fixture.json`), fixture.text)
  }
  writeFileSync(path.join(CATALOG_DIR(rootDir), 'proof-status.json'), generated.statusText)
}

function main() {
  const generated = generateAll()
  writeGenerated(REPO_ROOT, generated)
  // eslint-disable-next-line no-console
  console.log(`[catalog] generated ${manifestCaseCount(generated)} cases; native exports ${generated.inventory.counts.exports} (covered ${generated.inventory.coveredByImplementedCases.length})`)
}

function manifestCaseCount(generated) {
  return generated.manifest.cases.length
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  main()
}
