import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick } from 'vue'

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ apiFetch }) }))

import { useReportsList } from './useReportsList'

/**
 * Every filter must reach the query string **and** trigger a reload.
 *
 * The two used to be separate lists — the one that built the URL, and the one
 * a `watch` enumerated — so a filter could be added to the first and forgotten
 * in the second. It then travelled in the URL and never caused a request: the
 * screen simply did not move, and nothing said why. `filterKey` is now both,
 * and these tests hold it to that.
 */
beforeEach(() => {
  vi.clearAllMocks()
  apiFetch.mockResolvedValue({
    data: [],
    pagination: { page: 1, limit: 15, total: 0, totalPages: 1 },
  })
})

describe('filterKey', () => {
  it('carries every filter the toolbar offers', () => {
    const list = useReportsList()

    list.search.value = 'gare'
    list.filterStatus.value = 'en_attente'
    list.filterCategory.value = 'voirie'
    list.filterDays.value = 30
    list.onlyOverdue.value = true
    list.filterSource.value = 'agent'
    list.sortBy.value = 'votes'

    const key = list.filterKey.value

    expect(key).toContain('search=gare')
    expect(key).toContain('status=en_attente')
    expect(key).toContain('category=voirie')
    expect(key).toContain('since=30')
    expect(key).toContain('overdue=true')
    expect(key).toContain('source=agent')
    expect(key).toContain('sort=votes')
  })

  it('leaves the page out, so paging does not reset the page', () => {
    const list = useReportsList()

    expect(list.filterKey.value).not.toContain('page=')
    expect(list.listQuery.value).toContain('page=1')
  })

  it('changes when the source filter changes', async () => {
    const list = useReportsList()
    const before = list.filterKey.value

    list.filterSource.value = 'agent'
    await nextTick()

    expect(list.filterKey.value).not.toBe(before)
  })

  it('counts the source filter as an active filter', () => {
    const list = useReportsList()

    expect(list.hasFilters.value).toBe(false)
    list.filterSource.value = 'agent'
    expect(list.hasFilters.value).toBe(true)

    list.resetFilters()
    expect(list.filterSource.value).toBe('')
    expect(list.hasFilters.value).toBe(false)
  })
})
