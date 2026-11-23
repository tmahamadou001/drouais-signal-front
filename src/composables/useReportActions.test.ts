import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiFetch = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }))
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ apiFetch, invalidateCache: vi.fn(), invalidateCachePattern: vi.fn() }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))

import { useReportActions } from './useReportActions'

const make = () => useReportActions({ refresh: vi.fn().mockResolvedValue(undefined), invalidate: vi.fn() })
const calls = () => apiFetch.mock.calls.map(([url, options]) => `${options?.method ?? 'GET'} ${url}`)

beforeEach(() => { vi.clearAllMocks(); apiFetch.mockResolvedValue({}) })

describe('take — « Prendre en charge » se confie aussi le signalement', () => {
  it('assigns me first, then takes it: the report no longer stays « à assigner » while being handled', async () => {
    expect(await make().take({ id: 'r1', assignee_id: null }, 'me')).toBe(true)

    expect(calls()).toEqual(['POST /api/reports/r1/assign', 'PATCH /api/reports/r1/status'])
    // Seule la personne : le service que le signalement a déjà n'est pas touché.
    expect(apiFetch.mock.calls[0][1].body).toEqual({ assigneeId: 'me' })
    expect(apiFetch.mock.calls[1][1].body).toEqual({ status: 'pris_en_charge' })
  })

  it('never takes a report away from someone who has it', async () => {
    await make().take({ id: 'r1', assignee_id: 'julie' }, 'me')
    expect(calls()).toEqual(['PATCH /api/reports/r1/status'])
  })

  it('only changes the status when it does not know who I am', async () => {
    await make().take({ id: 'r1', assignee_id: null }, null)
    expect(calls()).toEqual(['PATCH /api/reports/r1/status'])
  })

  it('stops, and says why, when the assignment is refused — it does not move the status on its own', async () => {
    apiFetch.mockRejectedValueOnce(Object.assign(new Error('Un observateur n’est pas assignable.'), {}))

    expect(await make().take({ id: 'r1', assignee_id: null }, 'me')).toBe(false)

    expect(calls()).toEqual(['POST /api/reports/r1/assign'])
    expect(toast.error).toHaveBeenCalledWith('Assignation impossible', 'Un observateur n’est pas assignable.')
  })
})

describe('bulkTakeCharge', () => {
  const reports = [
    { id: 'a', status: 'en_attente', assignee_id: null },
    { id: 'b', status: 'transmis', assignee_id: 'julie' },
    { id: 'c', status: 'pris_en_charge', assignee_id: null },
  ] as never[]

  it('takes the selection, and assigns me only to those nobody has', async () => {
    await make().bulkTakeCharge(reports, ['a', 'b', 'c'], 'me')

    expect(calls()).toEqual(['POST /api/reports/a/assign', 'PATCH /api/reports/a/status', 'PATCH /api/reports/b/status'])
  })

  it('keeps its old behaviour when called without an identity', async () => {
    await make().bulkTakeCharge(reports, ['a'])
    expect(calls()).toEqual(['PATCH /api/reports/a/status'])
  })
})
