import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DataTable, { type DataColumn } from './DataTable.vue'

const COLUMNS: DataColumn[] = [
  { key: 'title', label: 'TITRE' },
  { key: 'status', label: 'STATUT', width: '120px' },
]

const ROWS = [
  { id: 'a', title: 'Nid-de-poule', status: 'en_attente' },
  { id: 'b', title: 'Lampadaire éteint', status: 'resolu' },
]

function table(props: Record<string, unknown> = {}) {
  return mount(DataTable, {
    props: { columns: COLUMNS, rows: ROWS, rowKey: 'id', ...props },
    global: { stubs: { AppIcon: true } },
  })
}

describe('rows', () => {
  it('renders one row per item', () => {
    expect(table().findAll('[id^="row-"]')).toHaveLength(2)
  })

  it('emits the row that was clicked', async () => {
    const wrapper = table()
    await wrapper.findAll('[id^="row-"]')[1].trigger('click')

    expect(wrapper.emitted('row-click')?.[0]).toEqual([ROWS[1]])
  })

  it('shows the empty message rather than an empty frame', () => {
    const wrapper = table({ rows: [], emptyMessage: 'Aucun signalement.' })

    expect(wrapper.text()).toContain('Aucun signalement.')
  })

  it('shows skeleton rows while loading, not the empty message', () => {
    const wrapper = table({ rows: [], loading: true, skeletonRows: 3, emptyMessage: 'Aucun signalement.' })

    expect(wrapper.text()).not.toContain('Aucun signalement.')
  })
})

describe('selection', () => {
  it('adds a row to the selection', async () => {
    const wrapper = table({ selectable: true, selected: [] })
    await wrapper.findAll('[aria-label="Sélectionner cette ligne"]')[0].trigger('click')

    expect(wrapper.emitted('update:selected')?.[0]).toEqual([['a']])
  })

  it('removes a row already selected', async () => {
    const wrapper = table({ selectable: true, selected: ['a'] })
    await wrapper.findAll('[aria-label="Sélectionner cette ligne"]')[0].trigger('click')

    expect(wrapper.emitted('update:selected')?.[0]).toEqual([[]])
  })

  it('selects every row from the header, and clears it back', async () => {
    const all = table({ selectable: true, selected: [] })
    await all.find('[aria-label="Tout sélectionner"]').trigger('click')
    expect(all.emitted('update:selected')?.[0]).toEqual([['a', 'b']])

    const none = table({ selectable: true, selected: ['a', 'b'] })
    await none.find('[aria-label="Tout désélectionner"]').trigger('click')
    expect(none.emitted('update:selected')?.[0]).toEqual([[]])
  })
})

describe('pagination', () => {
  it('says what is shown out of what exists', () => {
    const wrapper = table({ page: 2, pageSize: 15, total: 42, itemLabel: 'signalements' })

    expect(wrapper.text()).toContain('16 – 17 sur 42 signalements')
  })

  /**
   * When the screen filters in memory, the count must not suggest the whole
   * base was searched.
   */
  it('says so when the screen filtered the page itself', () => {
    const wrapper = table({ page: 1, pageSize: 15, total: 42, visibleCount: 1 })

    expect(wrapper.text()).toContain('1 sur 2 affichés · 42 au total')
  })

  it('emits the page asked for', async () => {
    const wrapper = table({ page: 1, pageSize: 15, total: 42 })
    await wrapper.find('[aria-label="Page suivante"]').trigger('click')

    expect(wrapper.emitted('page-change')?.[0]).toEqual([2])
  })

  it('shows no pagination when the screen does not paginate', () => {
    expect(table().find('[aria-label="Page suivante"]').exists()).toBe(false)
  })
})
