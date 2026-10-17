import type { TextField } from 'payload'

export const slugify = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

/** Slug único autogenerado a partir de `fromField` si se deja vacío. */
export const slugField = (fromField = 'title'): TextField => ({
  name: 'slug',
  type: 'text',
  unique: true,
  index: true,
  label: 'Slug (URL)',
  admin: {
    position: 'sidebar',
    description: 'Se genera solo a partir del título si lo dejás vacío.',
  },
  hooks: {
    beforeValidate: [
      ({ value, data }) => {
        if (typeof value === 'string' && value.trim()) return slugify(value)
        const source = data?.[fromField]
        return typeof source === 'string' ? slugify(source) : value
      },
    ],
  },
})
