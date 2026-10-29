import { describe, it, expect } from 'vitest'
import { categoryGlyph } from './categories'

describe('categoryGlyph', () => {
  it('maps every canonical slug of the national taxonomy', () => {
    const canonical = [
      'encombrants', 'graffitis', 'proprete', 'stationnement', 'mobilier',
      'voirie', 'commerce', 'vegetation', 'eau', 'local', 'autre',
    ]

    for (const slug of canonical) {
      expect(categoryGlyph(slug), slug).not.toBe('Pin')
    }
  })

  it('gives the same glyph for the same slug, whatever the label', () => {
    expect(categoryGlyph('voirie', 'Voirie')).toBe(categoryGlyph('voirie', 'Routes et trottoirs'))
  })

  /**
   * Communes installed before migration 026 still hold local slugs in old rows.
   * They must not all fall back to the same pin.
   */
  it('recognises the local slugs of the previous taxonomy', () => {
    expect(categoryGlyph('eclairage')).toBe('Lightbulb')
    expect(categoryGlyph('dechets')).toBe('Trash2')
    expect(categoryGlyph('espaces_verts')).toBe('Trees')
    expect(categoryGlyph('mobilier_urbain')).toBe('Armchair')
  })

  it('reads the label when the slug says nothing', () => {
    expect(categoryGlyph('cat_1757836291043', 'Fuites et canalisations')).toBe('Droplets')
  })

  it('strips accents before matching a keyword', () => {
    expect(categoryGlyph('unknown', 'Propreté urbaine')).toBe('Trash2')
  })

  /**
   * "eau" sits inside "nouveau", "réseau" and "bureau": a substring match would
   * file half the dictionary under a water pipe.
   */
  it('matches a word prefix, never a bare substring', () => {
    expect(categoryGlyph('unknown', 'Nouveaux bureaux')).toBe('Pin')
    expect(categoryGlyph('unknown', 'Eau potable')).toBe('Droplets')
  })

  it('falls back to a neutral pin', () => {
    expect(categoryGlyph('zzz', 'Quelque chose')).toBe('Pin')
  })
})
