import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import LifecycleDialog from './LifecycleDialog.vue'

const stubs = { AppIcon: true, Teleport: true }
const open = (props: Record<string, unknown> = {}) =>
  mount(LifecycleDialog, { props: { open: true, mode: 'annule', saving: false, ...props }, global: { stubs } })

describe('LifecycleDialog', () => {
  it.each(['annule', 'indesirable', 'reopen'] as const)('refuses an empty reason for %s', async (mode) => {
    const wrapper = open({ mode })
    expect(wrapper.find('[data-testid="lifecycle-submit"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[data-testid="lifecycle-text"]').setValue('   ')
    expect(wrapper.find('[data-testid="lifecycle-submit"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[data-testid="lifecycle-text"]').setValue('Hors compétence')
    expect(wrapper.find('[data-testid="lifecycle-submit"]').attributes('disabled')).toBeUndefined()
  })

  it('submits the trimmed reason', async () => {
    const wrapper = open({ mode: 'annule' })
    await wrapper.find('[data-testid="lifecycle-text"]').setValue('  Déjà traité  ')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')![0][0]).toMatchObject({ text: 'Déjà traité', date: null })
  })

  it('offers the stage to reopen at, defaulting to pris en charge', async () => {
    const wrapper = open({ mode: 'reopen' })
    expect((wrapper.find('[data-testid="reopen-target"]').element as HTMLSelectElement).value).toBe('pris_en_charge')

    await wrapper.find('[data-testid="reopen-target"]').setValue('en_attente')
    await wrapper.find('[data-testid="lifecycle-text"]').setValue('Erreur')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')![0][0]).toMatchObject({ target: 'en_attente', text: 'Erreur' })
  })

  it('plans with a date, the note being optional', async () => {
    const wrapper = open({ mode: 'plan' })
    expect(wrapper.find('[data-testid="lifecycle-submit"]').attributes('disabled')).toBeDefined()

    await wrapper.find('[data-testid="plan-date"]').setValue('2099-01-05')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')![0][0]).toMatchObject({ date: '2099-01-05', text: '' })
  })

  it('removes an existing date', async () => {
    const wrapper = open({ mode: 'plan', currentDate: '2099-01-05' })
    await nextTick()
    await wrapper.find('[data-testid="plan-remove"]').trigger('click')

    expect(wrapper.emitted('submit')![0][0]).toMatchObject({ date: null })
  })

  it('does not offer to remove a date that was never set', () => {
    expect(open({ mode: 'plan' }).find('[data-testid="plan-remove"]').exists()).toBe(false)
  })

  it('does not submit while saving', async () => {
    const wrapper = open({ mode: 'annule', saving: true })
    await wrapper.find('[data-testid="lifecycle-text"]').setValue('x')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('renders nothing when closed', () => {
    expect(open({ open: false }).find('form').exists()).toBe(false)
  })
})

describe('LifecycleDialog — une sélection', () => {
  it('says how many reports it touches, and that one reason covers them all', () => {
    const wrapper = open({ mode: 'annule', count: 4 })
    expect(wrapper.text()).toContain('Annuler 4 signalements')
    expect(wrapper.text()).toContain('Le même motif vaut pour toute la sélection')
  })

  it('keeps the singular wording for one report', () => {
    expect(open({ mode: 'annule', count: 1 }).text()).toContain('Annuler ce signalement')
  })

  it('does not rename the reopen and plan dialogs', () => {
    expect(open({ mode: 'reopen', count: 5 }).text()).toContain('Rouvrir ce signalement')
  })
})
