import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import ReportsFilterBar from './ReportsFilterBar.vue'
import FiltersPanel from './FiltersPanel.vue'
import ActiveFilterChips from './ActiveFilterChips.vue'
import ScopeSelector from './ScopeSelector.vue'

const stubs = { AppIcon: true }
const categories = [{ slug: 'voirie', label: 'Voirie et chaussée' }, { slug: 'eau', label: 'Eau et assainissement' }]
const bar = (over: Record<string, unknown> = {}) =>
  mount(ReportsFilterBar, {
    props: { status: '', category: '', days: 0, overdueOnly: false, reply: '', sort: 'recent', categories, overdueCount: 3, repliedCount: 2, waitingCount: 1, source: '', ...over } as never,
    global: { stubs },
    attachTo: document.body,
  })

describe('ReportsFilterBar', () => {
  it('shows the statuses, with the two closings folded under « Clos »', () => {
    const w = bar()
    expect(['all', 'en_attente', 'transmis', 'pris_en_charge', 'resolu'].every((s) => w.find(`[data-testid="status-${s}"]`).exists())).toBe(true)
    expect(w.find('[data-testid="status-annule"]').exists()).toBe(false)
  })

  it('opens « Clos » and picks a closing status', async () => {
    const w = bar()
    await w.find('[data-testid="status-closed"]').trigger('click')
    await w.find('[data-testid="status-indesirable"]').trigger('click')
    expect(w.emitted('update:status')![0]).toEqual(['indesirable'])
  })

  it('names the closing status on the « Clos » tab once chosen', () => {
    expect(bar({ status: 'annule' }).find('[data-testid="status-closed"]').text()).toContain('Annulé')
  })

  it('offers the two shortcuts with their counts, and toggles them', async () => {
    const w = bar()
    expect(w.find('[data-testid="quick-overdue"]').text()).toContain('3')
    await w.find('[data-testid="quick-overdue"]').trigger('click')
    await w.find('[data-testid="quick-replied"]').trigger('click')
    expect(w.emitted('update:overdueOnly')![0]).toEqual([true])
    expect(w.emitted('update:reply')![0]).toEqual(['received'])
  })

  it('hides « Réponse reçue » when nobody answered — a shortcut to nothing', () => {
    expect(bar({ repliedCount: 0 }).find('[data-testid="quick-replied"]').exists()).toBe(false)
    expect(bar({ repliedCount: 0, reply: 'received' }).find('[data-testid="quick-replied"]').exists()).toBe(true)
  })

  it('counts only what the panel holds on the Filtres button', () => {
    expect(bar().find('[data-testid="filters-count"]').exists()).toBe(false)
    expect(bar({ category: 'voirie', days: 30, overdueOnly: true }).find('[data-testid="filters-count"]').text()).toBe('2')
  })

  it('opens the panel, and closes it on Escape or an outside click', async () => {
    const w = bar()
    await w.find('[data-testid="open-filters"]').trigger('click')
    expect(w.find('[data-testid="filters-panel"]').exists()).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await nextTick()
    expect(w.find('[data-testid="filters-panel"]').exists()).toBe(false)

    await w.find('[data-testid="open-filters"]').trigger('click')
    document.body.click()
    await nextTick()
    expect(w.find('[data-testid="filters-panel"]').exists()).toBe(false)
  })

  it('says every active filter in a chip, and removes one at a time', async () => {
    const w = bar({ category: 'voirie', days: 30, source: 'agent', reply: 'waiting', overdueOnly: true })
    const labels = w.findAll('[data-testid^="chip-"]').map((c) => c.text())
    expect(labels).toEqual(expect.arrayContaining(['Voirie et chaussée', '30 j.', 'Saisis par la mairie', 'Précision demandée', 'En retard']))

    await w.find('[data-testid="chip-category"]').trigger('click')
    await w.find('[data-testid="chip-days"]').trigger('click')
    await w.find('[data-testid="chip-overdue"]').trigger('click')
    expect(w.emitted('update:category')![0]).toEqual([''])
    expect(w.emitted('update:days')![0]).toEqual([0])
    expect(w.emitted('update:overdueOnly')![0]).toEqual([false])
  })

  it('clears everything at once', async () => {
    const w = bar({ category: 'voirie' })
    await w.find('[data-testid="clear-filters"]').trigger('click')
    expect(w.emitted('reset')).toHaveLength(1)
  })

  it('shows no chip line when nothing is filtered', () => {
    expect(bar().find('[data-testid="active-filters"]').exists()).toBe(false)
  })

  it('changes the sort', async () => {
    const w = bar()
    await w.find('[data-testid="open-sort"]').trigger('click')
    await w.find('[data-testid="sort-oldest"]').trigger('click')
    expect(w.emitted('update:sort')![0]).toEqual(['oldest'])
  })
})

describe('FiltersPanel', () => {
  const panel = (cats = categories) =>
    mount(FiltersPanel, { props: { category: '', days: 0, source: '', reply: '', categories: cats, repliedCount: 2, waitingCount: 0 }, global: { stubs } })

  it('only searches categories once there are enough to need it', () => {
    expect(panel().find('[data-testid="category-search"]').exists()).toBe(false)
    const many = Array.from({ length: 10 }, (_, i) => ({ slug: `c${i}`, label: `Catégorie ${i}` }))
    expect(panel(many).find('[data-testid="category-search"]').exists()).toBe(true)
  })

  it('filters categories without regard to accents or case', async () => {
    const many = [...Array.from({ length: 8 }, (_, i) => ({ slug: `c${i}`, label: `Catégorie ${i}` })), { slug: 'eclairage', label: 'Éclairage public' }]
    const w = panel(many)
    await w.find('[data-testid="category-search"]').setValue('ECLAIR')
    expect(w.findAll('[data-testid^="category-"]').filter((b) => b.attributes('data-testid') !== 'category-all' && b.attributes('data-testid') !== 'category-search')).toHaveLength(1)
  })

  it('picks a period, an origin and an exchange state', async () => {
    const w = panel()
    await w.find('[data-testid="period-30"]').trigger('click')
    await w.find('[data-testid="source-citizen"]').trigger('click')
    await w.find('[data-testid="reply-received"]').trigger('click')
    expect(w.emitted('update:days')![0]).toEqual([30])
    expect(w.emitted('update:source')![0]).toEqual(['citizen'])
    expect(w.emitted('update:reply')![0]).toEqual(['received'])
  })
})

describe('ActiveFilterChips', () => {
  it('renders nothing without chips', () => {
    expect(mount(ActiveFilterChips, { props: { chips: [] }, global: { stubs } }).html()).toBe('<!--v-if-->')
  })
})

describe('ScopeSelector', () => {
  const services = [{ id: 's1', name: 'Voirie', color: '#3366cc' }, { id: 's2', name: 'Propreté', color: null }]
  const scope = (applied: string) => mount(ScopeSelector, { props: { applied, services: services as never, unassignedCount: 3 }, global: { stubs }, attachTo: document.body })

  it('keeps three fixed views and the count of what nobody has', () => {
    const w = scope('mine')
    expect(w.find('[data-testid="scope-unassigned"]').text()).toContain('3')
    expect(w.find('[data-testid="scope-mine"]').attributes('aria-selected')).toBe('true')
  })

  it('puts every service in a menu — a row of tabs would not hold six', async () => {
    const w = scope('all')
    expect(w.find('[data-testid="scope-service:s1"]').exists()).toBe(false)
    await w.find('[data-testid="scope-services"]').trigger('click')
    expect(w.findAll('[role="option"]').length).toBe(3)

    await w.find('[data-testid="scope-service:s2"]').trigger('click')
    expect(w.emitted('update:scope')![0]).toEqual(['service:s2'])
  })

  it('names the chosen service on the menu button', () => {
    expect(scope('service:s1').find('[data-testid="scope-services"]').text()).toContain('Voirie')
    expect(scope('external').find('[data-testid="scope-services"]').text()).toContain('Confiés à l’extérieur')
  })

  it('offers « confiés à l’extérieur » in the menu', async () => {
    const w = scope('all')
    await w.find('[data-testid="scope-services"]').trigger('click')
    await w.find('[data-testid="scope-external"]').trigger('click')
    expect(w.emitted('update:scope')![0]).toEqual(['external'])
  })
})
