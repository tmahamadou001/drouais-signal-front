import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const handlers: Record<string, () => void> = {}
const latlng = { lat: 48.4, lng: 1.0 }
const resolve = vi.fn()

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
      address: ref(null),
      resolving: ref(false),
      outsideCommune: computed(() => false),
      resolve,
    }),
  }
})
vi.mock('@/stores/tenant', () => ({
  useTenantStore: () => ({ mapCenter: { lat: 48.4, lng: 1.0, zoom: 13 }, slug: 'la-loupe' }),
}))
vi.mock('@/lib/ban', () => ({ searchAddress: vi.fn().mockResolvedValue([]) }))

import LocationPicker from './LocationPicker.vue'

beforeEach(() => {
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
})
