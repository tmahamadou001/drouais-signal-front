import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'

const store = vi.hoisted(() => ({ load: vi.fn(), save: vi.fn(), remove: vi.fn() }))
const list = ref<any[]>([])
vi.mock('@/composables/useReplyTemplates', () => ({
  useReplyTemplates: () => ({ templates: list, loading: ref(false), ...store }),
}))

import TemplatesAdminView from './TemplatesAdminView.vue'

const stubs = { AppIcon: true, AppModal: true, Teleport: true, AdminPageHeader: { template: '<header><slot name="actions" /></header>' } }
beforeEach(() => { vi.clearAllMocks(); list.value = []; store.save.mockResolvedValue(true); store.remove.mockResolvedValue(true) })

describe('TemplatesAdminView', () => {
  it('explains the empty state', () => {
    expect(mount(TemplatesAdminView, { global: { stubs } }).find('[data-testid="templates-empty"]').exists()).toBe(true)
  })

  it('lists the templates', () => {
    list.value = [{ id: 't1', title: 'Accusé', body: 'Bien reçu', updatedAt: '' }]
    const wrapper = mount(TemplatesAdminView, { global: { stubs } })
    expect(wrapper.findAll('[data-testid="template-row"]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Bien reçu')
  })

  it('creates a template, trimmed', async () => {
    const wrapper = mount(TemplatesAdminView, { global: { stubs } })
    await wrapper.find('[data-testid="new-template"]').trigger('click')
    await wrapper.find('[data-testid="template-title"]').setValue('  Accusé  ')
    await wrapper.find('[data-testid="template-body"]').setValue('  Bien reçu  ')
    await wrapper.find('[data-testid="template-form"]').trigger('submit')
    await flushPromises()

    expect(store.save).toHaveBeenCalledWith({ title: 'Accusé', body: 'Bien reçu' }, undefined)
    expect(wrapper.find('[data-testid="template-form"]').exists()).toBe(false)
  })

  it('edits an existing one by id, and keeps the form open if saving fails', async () => {
    list.value = [{ id: 't1', title: 'Accusé', body: 'Bien reçu', updatedAt: '' }]
    store.save.mockResolvedValue(false)
    const wrapper = mount(TemplatesAdminView, { global: { stubs } })
    await wrapper.find('[data-testid="template-row"] button').trigger('click')
    expect((wrapper.find('[data-testid="template-title"]').element as HTMLInputElement).value).toBe('Accusé')
    await wrapper.find('[data-testid="template-form"]').trigger('submit')
    await flushPromises()

    expect(store.save).toHaveBeenCalledWith({ title: 'Accusé', body: 'Bien reçu' }, 't1')
    expect(wrapper.find('[data-testid="template-form"]').exists()).toBe(true)
  })

  it('does not submit an empty form', async () => {
    const wrapper = mount(TemplatesAdminView, { global: { stubs } })
    await wrapper.find('[data-testid="new-template"]').trigger('click')
    expect(wrapper.find('[data-testid="template-submit"]').attributes('disabled')).toBeDefined()
  })
})
