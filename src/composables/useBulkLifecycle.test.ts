import { describe, it, expect, vi, beforeEach } from 'vitest'

const { apiFetch, invalidateCachePattern, toast } = vi.hoisted(() => ({
  apiFetch: vi.fn(), invalidateCachePattern: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ apiFetch, invalidateCachePattern }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))

import { useBulkLifecycle } from './useBulkLifecycle'

beforeEach(() => vi.clearAllMocks())

describe('useBulkLifecycle', () => {
  it('cancels a selection with one reason, then refreshes the list', async () => {
    apiFetch.mockResolvedValue({ data: { done: ['a', 'b'], failed: [] } })
    const onDone = vi.fn()
    const { closeMany, saving } = useBulkLifecycle(onDone)

    expect(await closeMany(['a', 'b'], 'annule', 'Voie privée')).toBe(true)

    expect(apiFetch).toHaveBeenCalledWith('/api/reports/close', { method: 'POST', body: { ids: ['a', 'b'], status: 'annule', comment: 'Voie privée' } })
    expect(toast.success).toHaveBeenCalledWith('2 signalements annulés')
    expect(onDone).toHaveBeenCalled()
    expect(invalidateCachePattern).toHaveBeenCalled()
    expect(saving.value).toBe(false)
  })

  it('says it in the singular for one row', async () => {
    apiFetch.mockResolvedValue({ data: { done: ['a'], failed: [] } })
    await useBulkLifecycle(vi.fn()).closeMany(['a'], 'indesirable', 'Spam')
    expect(toast.success).toHaveBeenCalledWith('1 signalement classé indésirable')
  })

  it('tells a partial result with the reason of the first refusal', async () => {
    apiFetch.mockResolvedValue({ data: { done: ['a'], failed: [{ id: 'b', code: 'status_final', message: 'déjà clos' }] } })
    expect(await useBulkLifecycle(vi.fn()).closeMany(['a', 'b'], 'annule', 'x')).toBe(true)
    expect(toast.info).toHaveBeenCalledWith('1 signalement annulé, 1 refusé', 'déjà clos')
  })

  it('reports false, and the reason, when nothing passed — so the dialog stays open', async () => {
    apiFetch.mockResolvedValue({ data: { done: [], failed: [{ id: 'a', code: 'status_final', message: 'déjà clos' }] } })
    expect(await useBulkLifecycle(vi.fn()).closeMany(['a'], 'annule', 'x')).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Rien n’a pu être fait', 'déjà clos')
  })

  it('merges a selection into the main report', async () => {
    apiFetch.mockResolvedValue({ data: { done: ['a', 'b', 'c'], failed: [] } })
    await useBulkLifecycle(vi.fn()).mergeMany(['a', 'b', 'c'], 'main')
    expect(apiFetch).toHaveBeenCalledWith('/api/reports/merge', { method: 'POST', body: { ids: ['a', 'b', 'c'], targetId: 'main' } })
    expect(toast.success).toHaveBeenCalledWith('3 doublons fusionnés')
  })

  it('fails with a readable message on a network error', async () => {
    apiFetch.mockRejectedValue({ message: 'Failed to fetch' })
    expect(await useBulkLifecycle(vi.fn()).mergeMany(['a'], 'm')).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Action impossible', 'Réessayez dans un instant.')
  })
})
