import { describe, it, expect } from 'vitest'
import {
  isOpen,
  totals,
  photoRate,
  daysSinceLastReport,
  openingConcerns,
  confirms,
  type Commune,
} from './communePipeline'

const NOW = new Date('2026-06-01T12:00:00Z')

function commune(over: Partial<Commune> = {}): Commune {
  return {
    id: 'tenant-1',
    slug: 'senonches-28373',
    name: 'Senonches',
    status: 'prospect',
    created_at: '2026-01-10T08:00:00Z',
    published_at: null,
    insee_codes: ['28373'],
    report_count: 20,
    report_count_30d: 4,
    last_report_at: '2026-05-28T08:00:00Z',
    account_count: 6,
    anonymous_count: 3,
    with_photo_count: 15,
    confirmation_count: 2,
    waitlist_count: 11,
    top_categories: [{ category: 'voirie', count: 9 }],
    ...over,
  }
}

describe('reading a commune', () => {
  it('tells an open commune from a silent one', () => {
    expect(isOpen(commune({ status: 'community' }))).toBe(true)
    expect(isOpen(commune({ status: 'prospect' }))).toBe(false)
  })

  it('adds up what the screen shows at the top', () => {
    const sums = totals([
      commune({ report_count: 20, waitlist_count: 11, status: 'community' }),
      commune({ report_count: 5, waitlist_count: 2 }),
    ])

    expect(sums).toEqual({ communes: 2, open: 1, reports: 25, waitlist: 13 })
  })

  it('has no photo rate for a commune with no reports', () => {
    expect(photoRate(commune({ report_count: 0, with_photo_count: 0 }))).toBeNull()
  })

  it('rounds the photo rate', () => {
    expect(photoRate(commune({ report_count: 3, with_photo_count: 2 }))).toBe(67)
  })

  it('counts the days of silence, never below zero', () => {
    expect(daysSinceLastReport(commune({ last_report_at: '2026-05-22T12:00:00Z' }), NOW)).toBe(10)
    expect(daysSinceLastReport(commune({ last_report_at: '2026-06-02T12:00:00Z' }), NOW)).toBe(0)
    expect(daysSinceLastReport(commune({ last_report_at: null }), NOW)).toBeNull()
  })
})

/**
 * Les objections ne bloquent rien : elles s'affichent dans la confirmation.
 * Une commune peut mériter d'être ouverte pour une raison qu'aucun chiffre ne
 * porte — mais la décision doit être prise en les ayant lues.
 */
describe('objections to opening a commune', () => {
  it('has none for a commune with a living record', () => {
    expect(openingConcerns(commune(), NOW)).toEqual([])
  })

  it('warns about a nearly empty page', () => {
    const concerns = openingConcerns(commune({ report_count: 3 }), NOW)

    expect(concerns.some((line) => line.includes('presque vide'))).toBe(true)
  })

  /** Douze signalements sont peut-être une seule personne obstinée. */
  it('warns when the reports may come from a single resident', () => {
    const concerns = openingConcerns(
      commune({ report_count: 12, account_count: 1, anonymous_count: 0 }),
      NOW
    )

    expect(concerns.some((line) => line.includes('une seule personne'))).toBe(true)
  })

  it('warns about a commune nobody has used for months', () => {
    const concerns = openingConcerns(commune({ last_report_at: '2025-12-01T08:00:00Z' }), NOW)

    expect(concerns.some((line) => line.includes('inactive'))).toBe(true)
  })

  it('warns when nothing has a photo', () => {
    const concerns = openingConcerns(commune({ with_photo_count: 0 }), NOW)

    expect(concerns.some((line) => line.includes('photo'))).toBe(true)
  })

  it('says nothing about photos for a commune with no reports at all', () => {
    const concerns = openingConcerns(
      commune({ report_count: 0, with_photo_count: 0, last_report_at: null }),
      NOW
    )

    expect(concerns.some((line) => line.includes('photo'))).toBe(false)
  })
})

describe('typing the commune name to confirm', () => {
  it('accepts the name, whatever the case and the surrounding spaces', () => {
    expect(confirms('Senonches', 'Senonches')).toBe(true)
    expect(confirms('  senonches ', 'Senonches')).toBe(true)
    expect(confirms('SENONCHES', 'Senonches')).toBe(true)
  })

  /** « Senonche » est une autre commune, et l'ouverture ne se défait pas. */
  it('refuses anything else', () => {
    expect(confirms('Senonche', 'Senonches')).toBe(false)
    expect(confirms('', 'Senonches')).toBe(false)
    expect(confirms('oui', 'Senonches')).toBe(false)
  })

  it('keeps accents significant', () => {
    expect(confirms('Melleville', 'Mélleville')).toBe(false)
  })
})
