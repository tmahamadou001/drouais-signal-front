import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ReportRowActions from './ReportRowActions.vue'
import ReportsBulkBar from './ReportsBulkBar.vue'

const stubs = { AppIcon: true, Teleport: true }
const row = (status: string) => mount(ReportRowActions, { props: { report: { id: 'r1', status } as never, loading: false, canDelete: true }, global: { stubs }, attachTo: document.body })

describe('ReportRowActions — trier', () => {
  it.each(['en_attente', 'transmis', 'pris_en_charge'])('offers the triage menu on a %s report', (status) => {
    expect(row(status).find('[data-testid="row-more"]').exists()).toBe(true)
  })

  it.each(['resolu', 'annule', 'indesirable'])('offers none on a %s report — it is reopened from its card', (status) => {
    expect(row(status).find('[data-testid="row-more"]').exists()).toBe(false)
  })

  it('opens the menu and emits the chosen gesture', async () => {
    const w = row('en_attente')
    expect(w.find('[data-testid="row-menu"]').exists()).toBe(false)
    await w.find('[data-testid="row-more"]').trigger('click')
    await nextTick()
    await w.find('[data-testid="row-annule"]').trigger('click')

    expect(w.emitted('lifecycle')![0]).toEqual(['annule'])
    expect(w.find('[data-testid="row-menu"]').exists()).toBe(false)
  })

  it('offers the three gestes', async () => {
    const w = row('en_attente')
    await w.find('[data-testid="row-more"]').trigger('click')
    await nextTick()
    expect(['row-merge', 'row-annule', 'row-indesirable'].every((id) => w.find(`[data-testid="${id}"]`).exists())).toBe(true)
  })

  it('closes on an outside click or Escape', async () => {
    const w = row('en_attente')
    await w.find('[data-testid="row-more"]').trigger('click')
    document.body.click()
    await nextTick()
    expect(w.find('[data-testid="row-menu"]').exists()).toBe(false)

    await w.find('[data-testid="row-more"]').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(w.find('[data-testid="row-menu"]').exists()).toBe(false)
  })

  it('does not trigger the row click underneath', async () => {
    const w = row('en_attente')
    expect(w.find('div').attributes()).toBeDefined()
    // le conteneur arrête la propagation : ouvrir un menu n'ouvre pas la fiche
    const stop = (w.vm.$el as HTMLElement)
    let reached = false
    document.body.addEventListener('click', () => { reached = true }, { once: true })
    stop.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(reached).toBe(false)
  })
})

describe('ReportsBulkBar — trier', () => {
  const bar = () => mount(ReportsBulkBar, { props: { loading: false, canDelete: false }, global: { stubs } })

  it('emits merge, annule and indesirable for the selection', async () => {
    const w = bar()
    await w.find('[data-testid="bulk-merge"]').trigger('click')
    await w.find('[data-testid="bulk-annule"]').trigger('click')
    await w.find('[data-testid="bulk-indesirable"]').trigger('click')
    expect(w.emitted('lifecycle')).toEqual([['merge'], ['annule'], ['indesirable']])
  })

  it('disables them while an action is running', () => {
    const w = mount(ReportsBulkBar, { props: { loading: true, canDelete: false }, global: { stubs } })
    expect(w.find('[data-testid="bulk-annule"]').attributes('disabled')).toBeDefined()
  })
})
