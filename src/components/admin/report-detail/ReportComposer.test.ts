import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

const list = ref<any[]>([])
const load = vi.fn()
vi.mock('@/composables/useReplyTemplates', () => ({ useReplyTemplates: () => ({ templates: list, loading: ref(false), load }) }))

import ReportComposer from './ReportComposer.vue'

const mountComposer = () => mount(ReportComposer, { props: { sending: false, uploading: false, unreachable: false }, global: { stubs: { AppIcon: true } } })

describe('ReportComposer — modèles', () => {
  it('shows no picker when the commune has no template', () => {
    list.value = []
    expect(mountComposer().find('[data-testid="open-templates"]').exists()).toBe(false)
  })

  it('inserts the chosen template into the draft without sending it', async () => {
    list.value = [{ id: 't1', title: 'Accusé', body: 'Bien reçu, un agent passera.', updatedAt: '' }]
    const wrapper = mountComposer()
    await wrapper.find('[data-testid="open-templates"]').trigger('click')
    await wrapper.find('[data-testid="template-t1"]').trigger('click')

    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('Bien reçu, un agent passera.')
    expect(wrapper.emitted('send')).toBeUndefined()
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('appends to what is already typed, and never exceeds the 500 characters', async () => {
    list.value = [{ id: 't1', title: 'Long', body: 'x'.repeat(500), updatedAt: '' }]
    const wrapper = mountComposer()
    await wrapper.find('textarea').setValue('Bonjour,')
    await wrapper.find('[data-testid="open-templates"]').trigger('click')
    await wrapper.find('[data-testid="template-t1"]').trigger('click')

    const value = (wrapper.find('textarea').element as HTMLTextAreaElement).value
    expect(value.startsWith('Bonjour,\nxxx')).toBe(true)
    expect(value.length).toBe(500)
  })
})

describe('ReportComposer — demander une précision', () => {
  it('sends an ordinary message by default', async () => {
    list.value = []
    const wrapper = mountComposer()
    await wrapper.find('textarea').setValue('Bonjour')
    await wrapper.find('button.flex.h-\\[34px\\]').trigger('click')

    expect(wrapper.emitted('send')![0]).toEqual(['Bonjour', undefined, false, false])
  })

  it('marks the message as a question, and says so on the button', async () => {
    list.value = []
    const wrapper = mountComposer()
    await wrapper.find('textarea').setValue('Quel numéro ?')
    await wrapper.find('[data-testid="question-toggle"] input').setValue(true)
    expect(wrapper.text()).toContain('Demander')

    await wrapper.find('button.flex.h-\\[34px\\]').trigger('click')
    expect(wrapper.emitted('send')![0]).toEqual(['Quel numéro ?', undefined, false, true])
  })

  it('forgets the question mark once the message is sent', async () => {
    list.value = []
    const wrapper = mountComposer()
    await wrapper.find('[data-testid="question-toggle"] input').setValue(true)
    ;(wrapper.vm as any).reset()
    await wrapper.vm.$nextTick()

    expect((wrapper.find('[data-testid="question-toggle"] input').element as HTMLInputElement).checked).toBe(false)
  })
})
