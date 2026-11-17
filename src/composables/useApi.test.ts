import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ accessToken: 'jeton' }) }))
vi.mock('@/utils/detectSlug', () => ({ detectSlug: () => 'dreux' }))

import { useApi } from './useApi'

/**
 * `apiFetch` sérialise le corps — une fois.
 *
 * Deux écrans lui passaient `JSON.stringify(...)` : le corps partait encodé
 * deux fois, `express.json()` le refusait, et le serveur répondait 500. C'est
 * ce qui empêchait d'ouvrir une commune au public (ONSIGNALE-API-3) et ce qui
 * cassait les trois gestes de modération.
 */
const fetchMock = vi.fn()

beforeEach(() => {
  fetchMock.mockReset()
  fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ ok: true }) })
  vi.stubGlobal('fetch', fetchMock)
})

function sentBody(): unknown {
  return fetchMock.mock.calls[0][1].body
}

describe('apiFetch body', () => {
  it('serialises an object body exactly once', async () => {
    const { apiFetch } = useApi()

    await apiFetch('/api/tenant/t1/status', { method: 'PATCH', body: { status: 'community' } })

    expect(sentBody()).toBe('{"status":"community"}')
    // Ce que le serveur reçoit doit redevenir l'objet, pas une chaîne.
    expect(JSON.parse(sentBody() as string)).toEqual({ status: 'community' })
  })

  it('refuses a pre-serialised string before sending anything', async () => {
    const { apiFetch } = useApi()
    const stringBody = JSON.stringify({ status: 'community' }) as unknown as object

    await expect(
      apiFetch('/api/tenant/t1/status', { method: 'PATCH', body: stringBody }),
    ).rejects.toThrow(TypeError)

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends JSON content type with an object body', async () => {
    const { apiFetch } = useApi()

    await apiFetch('/api/moderation/reports/r1/retract', { method: 'POST', body: { reason: 'injure' } })

    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBe('application/json')
  })

  it('passes FormData through untouched', async () => {
    const { apiFetch } = useApi()
    const form = new FormData()
    form.append('file', 'x')

    await apiFetch('/api/upload', { method: 'POST', body: form, isFormData: true })

    expect(sentBody()).toBe(form)
    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBeUndefined()
  })

  it('sends no body on a plain GET', async () => {
    const { apiFetch } = useApi()

    await apiFetch('/api/reports')

    expect(sentBody()).toBeUndefined()
  })
})
