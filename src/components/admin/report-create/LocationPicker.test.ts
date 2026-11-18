import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const handlers: Record<string, () => void> = {}
const latlng = { lat: 48.4, lng: 1.0 }
const resolve = vi.fn()
const search = vi.hoisted(() => vi.fn())
const shared = vi.hoisted(() => ({ address: null as null | { value: unknown } }))

vi.mock('leaflet/dist/leaflet.css', () => ({}))
vi.mock('leaflet', () => {
  const map: Record<string, unknown> = {}
  map.setView = () => map
  map.on = () => map
  map.remove = () => undefined
  const marker: Record<string, unknown> = {}
  marker.addTo = () => marker
  marker.setLatLng = () => marker
  marker.getLatLng = () => latlng
  marker.on = (name: string, fn: () => void) => {
    handlers[name] = fn
    return marker
  }
  const layer = { addTo: () => layer }
  return {
    default: { map: () => map, tileLayer: () => layer, marker: () => marker, divIcon: () => ({}) },
  }
})
vi.mock('@/composables/usePinAddress', async () => {
  const { ref, computed } = await import('vue')
  return {
    usePinAddress: () => ({
      address: (shared.address = ref(null)),
      resolving: ref(false),
      outsideCommune: computed(() => false),
      resolve,
    }),
  }
})
vi.mock('@/stores/tenant', () => ({
  useTenantStore: () => ({ mapCenter: { lat: 48.4, lng: 1.0, zoom: 13 }, slug: 'la-loupe' }),
}))
vi.mock('@/lib/ban', () => ({ searchAddress: search }))

import LocationPicker from './LocationPicker.vue'

beforeEach(() => {
  search.mockReset()
  search.mockResolvedValue([])
  resolve.mockClear()
  for (const key of Object.keys(handlers)) delete handlers[key]
})

describe('LocationPicker', () => {
  it('re-resolves the address and the commune check when the pin is dragged', () => {
    // Le point de départ existe : l'épingle est posée à l'ouverture, puis déplacée.
    const wrapper = mount(LocationPicker, {
      props: { position: { lat: 48.4, lng: 1.0 } },
      global: { stubs: { AppIcon: true } },
    })

    // Pose l'épingle par la recherche : `place` s'exécute et branche `dragend`.
    ;(wrapper.vm as unknown as { $: { setupState: { choose: (s: unknown) => void } } }).$.setupState.choose({
      label: 'x',
      lat: 48.4,
      lng: 1.0,
      inseeCode: null,
    })
    resolve.mockClear()

    latlng.lat = 48.41
    latlng.lng = 1.02
    handlers.dragend()

    expect(resolve).toHaveBeenCalledWith(48.41, 1.02)
    const emitted = wrapper.emitted('update:position')!
    expect(emitted[emitted.length - 1]).toEqual([{ lat: 48.41, lng: 1.02 }])
  })

  const mountPicker = () =>
    mount(LocationPicker, { props: { position: null }, global: { stubs: { AppIcon: true } } })

  const choose = (wrapper: ReturnType<typeof mountPicker>, suggestion: unknown) =>
    (wrapper.vm as unknown as { $: { setupState: { choose: (s: unknown) => void } } }).$.setupState.choose(suggestion)

  it('does not search again, nor reopen a list, after a suggestion is chosen', async () => {
    vi.useFakeTimers()
    const wrapper = mountPicker()
    const input = wrapper.find('input')

    await input.setValue('2 rue de chateaudun')
    await vi.advanceTimersByTimeAsync(400)
    expect(search).toHaveBeenCalledTimes(1)

    choose(wrapper, { label: '2 Rue de Chateaudun 28240 La Loupe', lat: 48.4, lng: 1.0, inseeCode: null })
    await wrapper.vm.$nextTick()
    await vi.advanceTimersByTimeAsync(400)

    expect(search).toHaveBeenCalledTimes(1)
    expect((input.element as HTMLInputElement).value).toBe('2 Rue de Chateaudun 28240 La Loupe')
    vi.useRealTimers()
  })

  it('writes the address of the pin into the field after it is dragged', async () => {
    const wrapper = mountPicker()
    choose(wrapper, { label: 'ancienne adresse', lat: 48.4, lng: 1.0, inseeCode: null })
    await wrapper.vm.$nextTick()

    handlers.dragend()
    shared.address!.value = { addressLabel: 'Place Vauban 28240 La Loupe', communeName: 'La Loupe', tenantSlug: 'la-loupe' }
    await wrapper.vm.$nextTick()

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('Place Vauban 28240 La Loupe')
  })

  it('keeps what was typed when the pin lands somewhere without an address', async () => {
    const wrapper = mountPicker()
    choose(wrapper, { label: 'ancienne adresse', lat: 48.4, lng: 1.0, inseeCode: null })
    await wrapper.vm.$nextTick()

    handlers.dragend()
    shared.address!.value = { addressLabel: null, communeName: 'La Loupe', tenantSlug: 'la-loupe' }
    await wrapper.vm.$nextTick()

    expect((wrapper.find('input').element as HTMLInputElement).value).toBe('ancienne adresse')
  })
})
