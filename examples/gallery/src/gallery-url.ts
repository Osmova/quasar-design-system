import { DESIGN_SYSTEM_VARIANTS, type DesignSystemVariantName } from '@osmova/quasar-design-system'

const tabs = ['tokens', 'typography', 'compare', 'components', 'forms', 'apps', 'catalog', 'variants', 'scenes', 'plugins', 'window', 'icons', 'fonts'] as const
export type GalleryTab = typeof tabs[number]

export function parseGalleryHash(hash: string) {
  const fragment = hash.replace(/^#\/?/, '')
  const separator = fragment.indexOf('?')
  const page = separator < 0 ? fragment : fragment.slice(0, separator)
  const params = new URLSearchParams(separator < 0 ? '' : fragment.slice(separator + 1))
  const value = params.get('variant')
  // Enumerable metadata contains only canonical variants, not legacy aliases.
  const variant = Object.values(DESIGN_SYSTEM_VARIANTS).find(item => item.name === value)?.name
  return {
    tab: tabs.includes(page as GalleryTab) ? page as GalleryTab : 'tokens' as const,
    variant,
    params,
  }
}

export function galleryHash(tab: GalleryTab, variant: DesignSystemVariantName, hash: string): string {
  const { params } = parseGalleryHash(hash)
  // Fluent keeps the legacy page-only shape. Unknown parameters remain author-owned.
  params.delete('variant')
  if (variant !== 'fluent') params.set('variant', variant)
  const query = params.toString()
  return tab === 'tokens' && !query ? '' : `#${tab}${query ? `?${query}` : ''}`
}
