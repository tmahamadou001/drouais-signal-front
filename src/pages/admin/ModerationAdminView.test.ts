import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { ModerationItem } from '@/lib/moderation'

const apiFetch = vi.fn()
const success = vi.fn()

vi.mock('@/composables/useApi', () => ({ useApi: () => ({ apiFetch }) }))
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success, error: vi.fn(), info: vi.fn() }),
}))

import ModerationAdminView from './ModerationAdminView.vue'

/**
 * L'écran de modération.
 *
 * Ce qu'il faut tenir : aucun geste ne part sans motif — la règle est la même
 * sur le serveur, et la doubler ici évite d'envoyer une requête qu'on sait
 * refusée — et chaque bouton appelle bien son propre chemin. Dépublier à la
 * place de retirer une photo détruirait l'information publique d'une commune
 * entière pour une plaque d'immatriculation.
 */

function item(over: Partial<ModerationItem> = {}): ModerationItem {
  return {
    id: 'report-1',
    reference: 'SEN-2026-00004',
    title: 'Nid-de-poule',
    description: 'Devant le 14',
    category: 'voirie',
    status: 'en_attente',
    photo_url: 'https://photos/1.jpg',
    address_approx: '14 rue des Fleurs',
    created_at: '2026-06-01T08:00:00Z',
    is_published: true,
    tenant: { id: 'tenant-1', slug: 'senonches-28373', name: 'Senonches' },
    ...over,
  }
}

async function screen(rows: ModerationItem[]) {
  apiFetch.mockResolvedValue({ data: rows })

  const wrapper = mount(ModerationAdminView, {
    global: { stubs: { AppIcon: true, AdminPageHeader: true, AppSkeleton: true, teleport: true } },
  })

  await flushPromises()
  return wrapper
}

const button = (wrapper: Awaited<ReturnType<typeof screen>>, label: string) =>
  wrapper.findAll('button').find((one) => one.text() === label)!

beforeEach(() => {
  apiFetch.mockReset()
  success.mockReset()
})

describe('the queue', () => {
  it('shows what is published, with its commune', async () => {
    const wrapper = await screen([item()])

    expect(wrapper.text()).toContain('Nid-de-poule')
    expect(wrapper.text()).toContain('Senonches')
  })

  it('says plainly when there is nothing to moderate', async () => {
    const wrapper = await screen([])

    expect(wrapper.text()).toContain('Rien à modérer')
  })

  /** Un signalement retiré reste dans la file, et le dit. */
  it('keeps a retracted report visible, marked, and offers to put it back', async () => {
    const wrapper = await screen([item({ is_published: false })])

    expect(wrapper.text()).toContain('Retiré du public')
    expect(button(wrapper, 'Republier')).toBeTruthy()
  })

  it('offers no photo removal when there is no photo', async () => {
    const wrapper = await screen([item({ photo_url: null })])

    expect(wrapper.findAll('button').some((b) => b.text() === 'Retirer la photo')).toBe(false)
  })
})

describe('each gesture', () => {
  const cases = [
    { label: 'Retirer la photo', confirm: 'Retirer la photo', path: 'photo' },
    { label: 'Dépublier', confirm: 'Dépublier', path: 'retract' },
  ]

  for (const one of cases) {
    it(`calls the ${one.path} route, and only once the reason is given`, async () => {
      const wrapper = await screen([item()])
      await button(wrapper, one.label).trigger('click')
      apiFetch.mockClear()

      // Le bouton de la boîte porte le même libellé que celui de la carte :
      // on prend le dernier, qui est celui de la confirmation.
      const confirmButtons = wrapper.findAll('button').filter((b) => b.text() === one.confirm)
      await confirmButtons[confirmButtons.length - 1].trigger('click')
      await flushPromises()

      expect(apiFetch).not.toHaveBeenCalled()

      await wrapper.find('input[type="text"]').setValue('Plaque lisible')
      await confirmButtons[confirmButtons.length - 1].trigger('click')
      await flushPromises()

      expect(apiFetch).toHaveBeenCalledWith(
        `/api/moderation/reports/report-1/${one.path}`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reason: 'Plaque lisible' }),
        })
      )
    })
  }

  it('restores a retracted report', async () => {
    const wrapper = await screen([item({ is_published: false })])
    await button(wrapper, 'Republier').trigger('click')
    apiFetch.mockClear()
    apiFetch.mockResolvedValue({ data: [] })

    await wrapper.find('input[type="text"]').setValue('Contenu vérifié')
    const confirms = wrapper.findAll('button').filter((b) => b.text() === 'Republier')
    await confirms[confirms.length - 1].trigger('click')
    await flushPromises()

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/moderation/reports/report-1/restore',
      expect.anything()
    )
  })

  it('tells the moderator what the gesture actually does', async () => {
    const wrapper = await screen([item()])
    await button(wrapper, 'Retirer la photo').trigger('click')

    expect(wrapper.text()).toContain('y compris du stockage')
    expect(wrapper.text()).toContain('irréversible')
  })

  it('reloads the queue afterwards', async () => {
    const wrapper = await screen([item()])
    await button(wrapper, 'Dépublier').trigger('click')
    await wrapper.find('input[type="text"]').setValue('Plaque lisible')
    apiFetch.mockClear()
    apiFetch.mockResolvedValue({ data: [] })

    const confirms = wrapper.findAll('button').filter((b) => b.text() === 'Dépublier')
    await confirms[confirms.length - 1].trigger('click')
    await flushPromises()

    expect(apiFetch.mock.calls.some((call) => String(call[0]).includes('/api/moderation/reports?'))).toBe(true)
  })
})
