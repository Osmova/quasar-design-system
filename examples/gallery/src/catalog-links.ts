export interface CatalogLink {
  name: string
  label: string
  description: string
  href: string
}

// Relative hrefs resolve against the deployed site root, where CI assembles both
// catalogs next to the gallery. Dev overrides point at locally served builds.
const env = import.meta.env as Record<string, string | undefined>

export const catalogLinks: CatalogLink[] = [
  {
    name: 'histoire',
    label: 'Histoire',
    description: 'Histoire component catalog',
    href: env.VITE_QDS_HISTOIRE_URL || 'histoire/',
  },
  {
    name: 'storybook',
    label: 'Storybook',
    description: 'Storybook component catalog',
    href: env.VITE_QDS_STORYBOOK_URL || 'storybook/',
  },
]
