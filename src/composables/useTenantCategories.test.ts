import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTenantStore } from '@/stores/tenant'
import { useTenantCategories } from './useTenantCategories'
import type { TenantCategory } from '@/types/tenant'

function category(slug: string, overrides: Partial<TenantCategory> = {}): TenantCategory {
  return {
    slug,
    label: slug.toUpperCase(),
    icon: '📌',
    color: '#123456',
    description: '',
    is_active: true,
    sort_order: 0,
    sla_hours: 168,
    ...overrides,
  }
}

const NOW = Date.parse('2026-09-15T12:00:00.000Z')

function hoursAgo(hours: number): string {
  return new Date(NOW - hours * 3600_000).toISOString()
}

/**
 * The clock is frozen at `NOW`.
 *
 * `hoursAgo` counts back from that fixed instant while `isOverdue` compares
 * against `Date.now()`. Without freezing, the gap between the two grew by a
 * day every day: "48 h old" became 72 h old, then 96 h, and the test started
 * failing on its own — a week after it was written, for no change to the code
 * it covers.
 */
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)

  setActivePinia(createPinia())
  const store = useTenantStore()
  store.data = {
    categories: [
      category('voirie', { label: 'Voirie', sla_hours: 72 }),
      category('eau', { label: 'Eau', sla_hours: 24 }),
      category('vegetation', { label: 'Espaces verts', is_active: false }),
    ],
  } as any
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getCategoryLabel', () => {
  it('reads the label the commune chose', () => {
    expect(useTenantCategories().getCategoryLabel('voirie')).toBe('Voirie')
  })

  /**
   * A report already filed in a category since switched off still needs its
   * label: that is history, not something offered for input.
   */
  it('still finds the label of a category the commune stopped handling', () => {
    expect(useTenantCategories().getCategoryLabel('vegetation')).toBe('Espaces verts')
  })

  it('falls back to the slug rather than showing nothing', () => {
    expect(useTenantCategories().getCategoryLabel('inconnue')).toBe('inconnue')
  })

  it('only offers the active categories for input', () => {
    expect(useTenantCategories().categories.value.map((c) => c.slug)).toEqual(['voirie', 'eau'])
  })
})

describe('isOverdue', () => {
  it('uses the SLA of the category, not a single threshold', () => {
    const { isOverdue } = useTenantCategories()

    // 48 h old: past the 24 h of "eau", still inside the 72 h of "voirie".
    expect(isOverdue({ category: 'eau', status: 'en_attente', created_at: hoursAgo(48) })).toBe(true)
    expect(isOverdue({ category: 'voirie', status: 'en_attente', created_at: hoursAgo(48) })).toBe(false)
  })

  it('never calls a resolved report overdue, however old', () => {
    const { isOverdue } = useTenantCategories()

    expect(isOverdue({ category: 'eau', status: 'resolu', created_at: hoursAgo(10_000) })).toBe(false)
  })

  it('falls back to a week for a category with no SLA', () => {
    const { isOverdue } = useTenantCategories()

    expect(isOverdue({ category: 'inconnue', status: 'en_attente', created_at: hoursAgo(100) })).toBe(false)
    expect(isOverdue({ category: 'inconnue', status: 'en_attente', created_at: hoursAgo(200) })).toBe(true)
  })
})
