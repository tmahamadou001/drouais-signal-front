import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const { reopen, plan, merge, changeCategory } = vi.hoisted(() => ({ reopen: vi.fn(), plan: vi.fn(), merge: vi.fn(), changeCategory: vi.fn() }))
vi.mock('@/composables/useLifecycle', async () => {
  const { ref } = await import('vue')
  return { useLifecycle: () => ({ saving: ref(false), reopen, plan, merge, changeCategory }) }
})

import ReportActions from './ReportActions.vue'

vi.mock('./MergeDialog.vue', () => ({ default: { props: ['open'], emits: ['merge', 'close'], template: '<button v-if="open" data-testid="fake-merge" @click="$emit(\'merge\', \'target-1\')" />' } }))
vi.mock('./CategoryDialog.vue', () => ({ default: { props: ['open'], emits: ['submit', 'close'], template: '<button v-if="open" data-testid="fake-category" @click="$emit(\'submit\', \'eclairage\')" />' } }))

const stubs = { AppIcon: true, AppModal: true, Teleport: true }
const report = (status: string, extra: Record<string, unknown> = {}) => ({ id: 'r1', status, ...extra })
const mountActions = (status: string, extra: Record<string, unknown> = {}) =>
  mount(ReportActions, { props: { report: report(status, extra) as never, loading: false, configuredRecipients: [] }, global: { stubs } })

beforeEach(() => { vi.clearAllMocks(); reopen.mockResolvedValue(true); plan.mockResolvedValue(true); merge.mockResolvedValue(true); changeCategory.mockResolvedValue(true) })

describe('ReportActions — cycle de vie', () => {
  it.each(['resolu', 'annule', 'indesirable'])('offers « Rouvrir » on a %s report, and nothing that changes its status', (status) => {
    const wrapper = mountActions(status)
    expect(wrapper.find('[data-testid="reopen"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="more-actions"]').exists()).toBe(false)
  })

  it('does not offer to reopen an open report', () => {
    expect(mountActions('pris_en_charge').find('[data-testid="reopen"]').exists()).toBe(false)
  })

  it('cancelling asks for a reason, then changes the status with it', async () => {
    const wrapper = mountActions('en_attente')
    await wrapper.find('[data-testid="more-actions"]').trigger('click')
    await wrapper.find('[data-testid="open-annule"]').trigger('click')
    await wrapper.find('[data-testid="lifecycle-text"]').setValue('Hors compétence')
    await wrapper.find('[data-testid="lifecycle-dialog"]').trigger('submit')

    expect(wrapper.emitted('updateStatus')![0]).toEqual(['annule', 'Hors compétence'])
  })

  it('classing as unwanted goes through the same route', async () => {
    const wrapper = mountActions('en_attente')
    await wrapper.find('[data-testid="more-actions"]').trigger('click')
    await wrapper.find('[data-testid="open-indesirable"]').trigger('click')
    await wrapper.find('[data-testid="lifecycle-text"]').setValue('Publicité')
    await wrapper.find('[data-testid="lifecycle-dialog"]').trigger('submit')

    expect(wrapper.emitted('updateStatus')![0]).toEqual(['indesirable', 'Publicité'])
  })

  it('reopens through the dedicated route and asks the panel to reload', async () => {
    const wrapper = mountActions('resolu')
    await wrapper.find('[data-testid="reopen"]').trigger('click')
    await wrapper.find('[data-testid="lifecycle-text"]').setValue('Le problème est revenu')
    await wrapper.find('[data-testid="lifecycle-dialog"]').trigger('submit')
    await flushPromises()

    expect(reopen).toHaveBeenCalledWith('r1', 'Le problème est revenu', 'pris_en_charge')
    expect(wrapper.emitted('changed')).toHaveLength(1)
    expect(wrapper.emitted('updateStatus')).toBeUndefined()
  })

  it('stays open when the reopening fails', async () => {
    reopen.mockResolvedValue(false)
    const wrapper = mountActions('resolu')
    await wrapper.find('[data-testid="reopen"]').trigger('click')
    await wrapper.find('[data-testid="lifecycle-text"]').setValue('x')
    await wrapper.find('[data-testid="lifecycle-dialog"]').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('changed')).toBeUndefined()
    expect(wrapper.find('[data-testid="lifecycle-dialog"]').exists()).toBe(true)
  })

  it('plans an intervention and says « Modifier » when one exists', async () => {
    const wrapper = mountActions('pris_en_charge', { planned_for: '2099-01-05' })
    await wrapper.find('[data-testid="more-actions"]').trigger('click')
    expect(wrapper.find('[data-testid="open-plan"]').text()).toContain('Modifier la date')

    await wrapper.find('[data-testid="open-plan"]').trigger('click')
    await wrapper.find('[data-testid="plan-date"]').setValue('2099-02-01')
    await wrapper.find('[data-testid="lifecycle-dialog"]').trigger('submit')
    await flushPromises()

    expect(plan).toHaveBeenCalledWith('r1', '2099-02-01', null)
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })

  it('merges the duplicate into the chosen report and asks the panel to reload', async () => {
    const wrapper = mountActions('en_attente')
    await wrapper.find('[data-testid="more-actions"]').trigger('click')
    await wrapper.find('[data-testid="open-merge"]').trigger('click')
    await wrapper.find('[data-testid="fake-merge"]').trigger('click')
    await flushPromises()

    expect(merge).toHaveBeenCalledWith('r1', 'target-1')
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })

  it('corrects the category and asks the panel to reload', async () => {
    const wrapper = mountActions('en_attente')
    await wrapper.find('[data-testid="more-actions"]').trigger('click')
    await wrapper.find('[data-testid="open-category"]').trigger('click')
    await wrapper.find('[data-testid="fake-category"]').trigger('click')
    await flushPromises()

    expect(changeCategory).toHaveBeenCalledWith('r1', 'eclairage')
    expect(wrapper.emitted('changed')).toHaveLength(1)
  })

  it('does not reload when the merge is refused', async () => {
    merge.mockResolvedValue(false)
    const wrapper = mountActions('en_attente')
    await wrapper.find('[data-testid="more-actions"]').trigger('click')
    await wrapper.find('[data-testid="open-merge"]').trigger('click')
    await wrapper.find('[data-testid="fake-merge"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('changed')).toBeUndefined()
  })
})

describe('ReportActions — le bas du panneau reste compact', () => {
  it('puts advancing and resolving on one row, and « Transmettre » as a discreet link under it', () => {
    const wrapper = mountActions('en_attente')
    expect(wrapper.find('[data-testid="take"]').classes()).toContain('h-9')
    expect(wrapper.find('[data-testid="resolve"]').classes()).toContain('h-9')
    expect(wrapper.find('[data-testid="take"]').element.parentElement).toBe(wrapper.find('[data-testid="resolve"]').element.parentElement)
    expect(wrapper.find('[data-testid="transmit"]').exists()).toBe(true)
  })

  it('keeps the way back inside « Plus d’actions », not as a row of its own', async () => {
    const wrapper = mountActions('pris_en_charge')
    expect(wrapper.find('[data-testid="rollback-title"]').exists()).toBe(false)

    await wrapper.find('[data-testid="more-actions"]').trigger('click')
    expect(wrapper.find('[data-testid="rollback-title"]').exists()).toBe(true)

    await wrapper.find('[data-testid="rollback-en_attente"]').trigger('click')
    expect(wrapper.emitted('updateStatus')?.[0]?.[0]).toBe('en_attente')
    expect(wrapper.find('[data-testid="rollback-title"]').exists()).toBe(false)
  })

  it('does not offer to transmit once the report is closed', () => {
    expect(mountActions('resolu').find('[data-testid="transmit"]').exists()).toBe(false)
  })

  it('announces the transmission by what is configured', () => {
    const wrapper = mount(ReportActions, { props: { report: report('en_attente') as never, loading: false, configuredRecipients: ['a@x.fr', 'b@x.fr'] }, global: { stubs } })
    expect(wrapper.find('[data-testid="transmit"]').text()).toContain('ces intervenants')
  })
})

describe('ReportActions — le menu « Plus d’actions » passe au-dessus de la carte', () => {
  const real = () => mount(ReportActions, { props: { report: report('pris_en_charge') as never, loading: false, configuredRecipients: [] }, global: { stubs: { AppIcon: true, AppModal: true } }, attachTo: document.body })

  it('is rendered in body, not inside the panel footer where the map’s layers cover it', async () => {
    const wrapper = real()
    await wrapper.get('[data-testid="more-actions"]').trigger('click')
    await flushPromises()

    const menu = document.body.querySelector('[data-testid="more-menu"]') as HTMLElement
    expect(menu).not.toBeNull()
    expect(wrapper.element.contains(menu)).toBe(false)
    // Au-dessus des couches de Leaflet (jusqu'à 1000 dans leur contexte) comme de la fenêtre du panneau.
    expect(menu.className).toContain('z-[90]')
    wrapper.unmount()
  })

  it('opens upward from the button, keeps to the screen, and scrolls when short of room', async () => {
    const wrapper = real()
    Object.defineProperty(window, 'innerHeight', { value: 700, configurable: true })
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true })
    const anchor = wrapper.get('[data-testid="more-actions"]').element.parentElement as HTMLElement
    anchor.getBoundingClientRect = () => ({ top: 640, bottom: 664, left: 1000, right: 1100, width: 100, height: 24, x: 1000, y: 640, toJSON: () => ({}) })

    await wrapper.get('[data-testid="more-actions"]').trigger('click')
    await flushPromises()

    const menu = document.body.querySelector('[data-testid="more-menu"]') as HTMLElement
    expect(menu.style.bottom).toBe('66px') // 700 − 640 + 6 : collé au haut du bouton
    expect(menu.style.right).toBe('100px')
    expect(parseInt(menu.style.maxHeight)).toBeLessThanOrEqual(626)
    expect(menu.className).toContain('overflow-y-auto')
    wrapper.unmount()
  })

  it('closes on a click elsewhere', async () => {
    const wrapper = real()
    await wrapper.get('[data-testid="more-actions"]').trigger('click')
    document.body.click()
    await flushPromises()
    expect(document.body.querySelector('[data-testid="more-menu"]')).toBeNull()
    wrapper.unmount()
  })
})
