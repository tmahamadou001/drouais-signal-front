import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ apiFetch }) }))

import { useTreatmentStats } from './useTreatmentStats'

beforeEach(() => vi.clearAllMocks())

describe('useTreatmentStats', () => {
  it('reads the period the page is on', async () => {
    apiFetch.mockResolvedValue({ period_days: 90, indicators: null, by_service: [], by_service_category: [] })
    const period = ref<string | number>(90)
    const { data, load, loading } = useTreatmentStats(period)

    await load()

    expect(apiFetch).toHaveBeenCalledWith('/api/admin/treatment?days=90')
    expect(data.value?.period_days).toBe(90)
    expect(loading.value).toBe(false)
  })

  it('fails quietly — the performance page must survive it', async () => {
    apiFetch.mockRejectedValue(new Error('boom'))
    const { data, failed, load } = useTreatmentStats(ref(30))

    await load()

    expect(failed.value).toBe(true)
    expect(data.value).toBeNull()
  })

  it('clears the failure on the next attempt', async () => {
    apiFetch.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ period_days: 30, indicators: null, by_service: [], by_service_category: [] })
    const { failed, load } = useTreatmentStats(ref(30))
    await load()
    await load()
    expect(failed.value).toBe(false)
  })
})
