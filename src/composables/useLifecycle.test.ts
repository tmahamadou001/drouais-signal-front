import { describe, it, expect, vi, beforeEach } from 'vitest'

const { apiFetch, invalidateCache, toast } = vi.hoisted(() => ({
  apiFetch: vi.fn(), invalidateCache: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ apiFetch, invalidateCache }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))

import { useLifecycle } from './useLifecycle'

beforeEach(() => vi.clearAllMocks())

describe('useLifecycle', () => {
  it('reopens with the reason and the target stage', async () => {
    apiFetch.mockResolvedValue({})
    const { reopen, saving } = useLifecycle()

    expect(await reopen('r1', 'Revenu', 'en_attente')).toBe(true)

    expect(apiFetch).toHaveBeenCalledWith('/api/reports/r1/reopen', { method: 'POST', body: { comment: 'Revenu', status: 'en_attente' } })
    expect(invalidateCache).toHaveBeenCalledWith('/api/reports/r1')
    expect(toast.success).toHaveBeenCalled()
    expect(saving.value).toBe(false)
  })

  it('relays the server message when reopening fails', async () => {
    apiFetch.mockRejectedValue({ message: 'Ce signalement n’est pas clos' })
    const { reopen } = useLifecycle()

    expect(await reopen('r1', 'x', 'pris_en_charge')).toBe(false)
    expect(toast.error).toHaveBeenCalledWith('Réouverture impossible', 'Ce signalement n’est pas clos')
  })

  it('plans, and removes a date with null', async () => {
    apiFetch.mockResolvedValue({})
    const { plan } = useLifecycle()

    await plan('r1', '2026-12-02', 'Matin')
    expect(apiFetch).toHaveBeenLastCalledWith('/api/reports/r1/plan', { method: 'PUT', body: { plannedFor: '2026-12-02', note: 'Matin' } })

    await plan('r1', null, null)
    expect(toast.success).toHaveBeenLastCalledWith('Date retirée', undefined)
  })

  it('falls back to a generic message on a network failure', async () => {
    apiFetch.mockRejectedValue({ message: 'Failed to fetch' })
    await useLifecycle().plan('r1', '2026-12-02', null)
    expect(toast.error).toHaveBeenCalledWith('Planification impossible', 'Réessayez dans un instant.')
  })
})
