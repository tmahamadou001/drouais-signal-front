import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ apiFetch }) }))
vi.mock('@/composables/useTenantCategories', async () => {
  const { ref } = await import('vue')
  return { useTenantCategories: () => ({ categories: ref([{ slug: 'voirie', label: 'Voirie' }, { slug: 'eclairage', label: 'Éclairage' }]) }) }
})

import MergeDialog from './MergeDialog.vue'
import CategoryDialog from './CategoryDialog.vue'

const stubs = { AppIcon: true, Teleport: true }
const row = (id: string, status = 'en_attente') => ({ id, title: `Signalement ${id}`, reference: `DRE-${id}`, status, address_approx: 'rue X' })

beforeEach(() => { vi.clearAllMocks(); vi.useFakeTimers() })

describe('MergeDialog', () => {
  const open = () => mount(MergeDialog, { props: { open: true, reportId: 'self', saving: false }, global: { stubs } })

  async function search(wrapper: ReturnType<typeof open>, text: string) {
    await wrapper.find('[data-testid="merge-search"]').setValue(text)
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()
  }

  it('waits for the typing to stop, and searches the whole commune', async () => {
    apiFetch.mockResolvedValue({ data: [] })
    const wrapper = open()

    await wrapper.find('[data-testid="merge-search"]').setValue('nid')
    expect(apiFetch).not.toHaveBeenCalled()
    await wrapper.find('[data-testid="merge-search"]').setValue('nid de poule')
    await vi.advanceTimersByTimeAsync(300)

    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(apiFetch.mock.calls[0][0]).toContain('search=nid%20de%20poule')
    expect(apiFetch.mock.calls[0][0]).toContain('scope=all')
  })

  it('does not search for a single letter', async () => {
    const wrapper = open()
    await search(wrapper, 'n')
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('drops the report itself and the closed ones — the server would refuse them', async () => {
    apiFetch.mockResolvedValue({ data: [row('self'), row('a'), row('b', 'resolu'), row('c', 'annule'), row('d', 'pris_en_charge')] })
    const wrapper = open()
    await search(wrapper, 'nid')

    expect(wrapper.findAll('[role="radio"]').map((r) => r.attributes('data-testid'))).toEqual(['merge-a', 'merge-d'])
  })

  it('says so when nothing matches', async () => {
    apiFetch.mockResolvedValue({ data: [] })
    const wrapper = open()
    await search(wrapper, 'zzz')
    expect(wrapper.find('[data-testid="merge-empty"]').exists()).toBe(true)
  })

  it('cannot merge before choosing, then emits the chosen target', async () => {
    apiFetch.mockResolvedValue({ data: [row('a')] })
    const wrapper = open()
    await search(wrapper, 'nid')
    expect(wrapper.find('[data-testid="merge-submit"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[data-testid="merge-a"]').trigger('click')
    await wrapper.find('[data-testid="merge-submit"]').trigger('click')

    expect(wrapper.emitted('merge')![0]).toEqual(['a'])
  })

  it('survives a failed search', async () => {
    apiFetch.mockRejectedValue(new Error('boom'))
    const wrapper = open()
    await search(wrapper, 'nid')
    expect(wrapper.findAll('[role="radio"]')).toHaveLength(0)
  })
})

describe('CategoryDialog', () => {
  const open = (current = 'voirie') => mount(CategoryDialog, { props: { open: true, current, saving: false }, global: { stubs } })

  it('starts on the current category and cannot submit it again', () => {
    const wrapper = open()
    expect(wrapper.find('[data-testid="category-voirie"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.find('[data-testid="category-submit"]').attributes('disabled')).toBeDefined()
  })

  it('submits another category', async () => {
    const wrapper = open()
    await wrapper.find('[data-testid="category-eclairage"]').trigger('click')
    await wrapper.find('[data-testid="category-dialog"]').trigger('submit')

    expect(wrapper.emitted('submit')![0]).toEqual(['eclairage'])
  })

  it('does not submit while saving', async () => {
    const wrapper = mount(CategoryDialog, { props: { open: true, current: 'voirie', saving: true }, global: { stubs } })
    await wrapper.find('[data-testid="category-eclairage"]').trigger('click')
    expect(wrapper.find('[data-testid="category-submit"]').attributes('disabled')).toBeDefined()
  })
})

describe('MergeDialog — depuis le tableau', () => {
  it('leaves out every report of the selection: none of them can be the main one', async () => {
    apiFetch.mockResolvedValue({ data: [row('a'), row('b'), row('c')] })
    const wrapper = mount(MergeDialog, { props: { open: true, excludeIds: ['a', 'b'], saving: false }, global: { stubs } })
    await wrapper.find('[data-testid="merge-search"]').setValue('nid')
    await vi.advanceTimersByTimeAsync(300)
    await flushPromises()

    expect(wrapper.findAll('[role="radio"]').map((r) => r.attributes('data-testid'))).toEqual(['merge-c'])
  })

  it('says how many reports it merges when there are several', () => {
    const wrapper = mount(MergeDialog, { props: { open: true, excludeIds: ['a', 'b', 'c'], saving: false }, global: { stubs } })
    expect(wrapper.text()).toContain('Fusionner 3 signalements dans')
  })

  it('keeps the single wording for one report', () => {
    const wrapper = mount(MergeDialog, { props: { open: true, excludeIds: ['a'], saving: false }, global: { stubs } })
    expect(wrapper.text()).toContain('Fusionner avec un autre signalement')
  })
})
