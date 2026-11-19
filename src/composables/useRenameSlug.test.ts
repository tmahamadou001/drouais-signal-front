import { describe, it, expect, vi, beforeEach } from 'vitest'

const apiFetch = vi.fn()
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ apiFetch }) }))

import { useRenameSlug } from './useRenameSlug'
import { useToast, resetToasts } from './useToast'

const tenant = { id: 't1', name: 'Villemeux-sur-Eure', slug: 'villemeux-sur-eure-28415' }

beforeEach(() => {
  apiFetch.mockReset()
  resetToasts()
})

describe('useRenameSlug', () => {
  it('patches the slug, closes, tells the user and refreshes', async () => {
    apiFetch.mockResolvedValue({ slug: 'villemeux-sur-eure', previous_slug: tenant.slug })
    const onDone = vi.fn()
    const rename = useRenameSlug(onDone)

    rename.open(tenant)
    await rename.submit('villemeux-sur-eure')

    expect(apiFetch).toHaveBeenCalledWith('/api/tenant/t1/slug', { method: 'PATCH', body: { slug: 'villemeux-sur-eure' } })
    expect(rename.target.value).toBeNull()
    expect(onDone).toHaveBeenCalledOnce()
    expect(useToast().toasts.value[0].title).toContain('nouvelle adresse')
  })

  it('keeps the dialog open and shows the refusal', async () => {
    apiFetch.mockRejectedValue({ message: 'Cette adresse est déjà utilisée.' })
    const onDone = vi.fn()
    const rename = useRenameSlug(onDone)

    rename.open(tenant)
    await rename.submit('dreux')

    expect(rename.target.value).toEqual(tenant)
    expect(rename.error.value).toBe('Cette adresse est déjà utilisée.')
    expect(onDone).not.toHaveBeenCalled()
  })

  it('does not send twice while a request is running', async () => {
    let finish: (v: unknown) => void = () => {}
    apiFetch.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const rename = useRenameSlug(vi.fn())

    rename.open(tenant)
    const first = rename.submit('un-nom')
    await rename.submit('un-nom')
    finish({ slug: 'un-nom', previous_slug: 'x' })
    await first

    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('cannot be closed mid-request', async () => {
    let finish: (v: unknown) => void = () => {}
    apiFetch.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const rename = useRenameSlug(vi.fn())

    rename.open(tenant)
    const pending = rename.submit('un-nom')
    rename.close()
    expect(rename.target.value).toEqual(tenant)
    finish({ slug: 'un-nom', previous_slug: 'x' })
    await pending
  })
})
