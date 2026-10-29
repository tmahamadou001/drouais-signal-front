import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useTenantStore } from './tenant'
import type { TenantCategory } from '@/types/tenant'

vi.mock('@/utils/detectSlug', () => ({ detectSlug: () => 'la-loupe' }))

function category(slug: string, isActive: boolean): TenantCategory {
  return {
    slug,
    label: slug,
    icon: '📌',
    color: null,
    description: '',
    is_active: isActive,
    sort_order: 0,
    sla_hours: 168,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.restoreAllMocks()
})

describe('categories', () => {
  /**
   * `GET /api/tenant/config` only returns active categories — that is what the
   * citizen app needs. The back-office shows reports already filed, some of them
   * in categories the commune has since switched off.
   */
  it('falls back to the active list until the full one is loaded', () => {
    const store = useTenantStore()
    store.data = { categories: [category('voirie', true)] } as any

    expect(store.categories).toHaveLength(1)
  })

  it('serves the full list once loaded, inactive ones included', async () => {
    const store = useTenantStore()
    store.data = { categories: [category('voirie', true)] } as any

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [category('voirie', true), category('vegetation', false)],
    }))

    await store.loadAllCategories()

    expect(store.categories.map((c) => c.slug)).toEqual(['voirie', 'vegetation'])
    expect(store.activeCategories.map((c) => c.slug)).toEqual(['voirie'])
  })

  it('keeps the active list when the full one cannot be loaded', async () => {
    const store = useTenantStore()
    store.data = { categories: [category('voirie', true)] } as any

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

    await store.loadAllCategories()

    expect(store.categories.map((c) => c.slug)).toEqual(['voirie'])
  })
})

describe('mapCenter', () => {
  /**
   * The fallback used to be the town hall of Dreux, from the days of a single
   * commune. For any other one, that is a wrong map, not a default one.
   */
  it('centres on France when the commune has no coordinates', () => {
    const store = useTenantStore()
    store.data = { config: { map_lat: null, map_lng: null, map_zoom: null } } as any

    expect(store.mapCenter).toEqual({ lat: 46.6, lng: 2.5, zoom: 5 })
  })

  it('uses the coordinates of the commune when it has them', () => {
    const store = useTenantStore()
    store.data = { config: { map_lat: 48.47, map_lng: 1.0, map_zoom: 14 } } as any

    expect(store.mapCenter).toEqual({ lat: 48.47, lng: 1.0, zoom: 14 })
  })

  it('zooms in by default once coordinates are known', () => {
    const store = useTenantStore()
    store.data = { config: { map_lat: 48.47, map_lng: 1.0, map_zoom: null } } as any

    expect(store.mapCenter.zoom).toBe(13)
  })
})
