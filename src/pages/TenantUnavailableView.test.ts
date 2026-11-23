import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import TenantUnavailableView from './TenantUnavailableView.vue'
import { useTenantStore } from '@/stores/tenant'

beforeEach(() => setActivePinia(createPinia()))

const make = () => mount(TenantUnavailableView, { global: { stubs: { BrandWordmark: true, AppIcon: true } } })

describe('TenantUnavailableView', () => {
  it('never says the city does not exist: the answer is missing, not the commune', () => {
    const store = useTenantStore()
    store.errorKind = 'rate_limited'
    const text = make().text()
    expect(text).not.toContain('pas encore configurée')
    expect(text).toContain('trop de requêtes')
  })

  it('tells an outage apart from a request limit', () => {
    const store = useTenantStore()
    store.errorKind = 'unavailable'
    expect(make().text()).toContain('indisponible')
  })

  it('offers to try again, which reloads the commune', async () => {
    const store = useTenantStore()
    store.errorKind = 'unavailable'
    store.load = vi.fn().mockResolvedValue(undefined)
    await make().get('[data-testid="tenant-retry"]').trigger('click')
    expect(store.load).toHaveBeenCalled()
  })
})
