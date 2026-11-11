import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import type { Commune } from '@/lib/communePipeline'

const apiFetch = vi.fn()

vi.mock('@/composables/useApi', () => ({ useApi: () => ({ apiFetch }) }))
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}))

import ProspectsAdminView from './ProspectsAdminView.vue'
import PublicationDialog from '@/components/admin/prospects/PublicationDialog.vue'

/**
 * L'écran des communes sans mairie.
 *
 * Ce qui est vérifié ici n'est pas la mise en page : c'est que le geste
 * d'ouverture part bien vers le bon statut, et surtout qu'il **ne part pas**
 * tant que la confirmation n'a pas été franchie. Une ouverture rend publics
 * les signalements d'une commune qui n'a rien signé, et aucun écran ne permet
 * de revenir sur ce qui aura été vu.
 */

function commune(over: Partial<Commune> = {}): Commune {
  return {
    id: 'tenant-1',
    slug: 'senonches-28373',
    name: 'Senonches',
    status: 'prospect',
    created_at: '2026-01-10T08:00:00Z',
    published_at: null,
    insee_codes: ['28373'],
    report_count: 20,
    report_count_30d: 4,
    last_report_at: new Date().toISOString(),
    account_count: 6,
    anonymous_count: 3,
    with_photo_count: 15,
    confirmation_count: 2,
    waitlist_count: 11,
    top_categories: [{ category: 'voirie', count: 9 }],
    ...over,
  }
}

async function screen(rows: Commune[]) {
  apiFetch.mockResolvedValue(rows)

  const wrapper = mount(ProspectsAdminView, {
    global: {
      stubs: { AppIcon: true, AdminPageHeader: true, teleport: true },
    },
  })

  await flushPromises()
  return wrapper
}

/** Le bouton de la ligne du tableau. */
const rowButton = (wrapper: Awaited<ReturnType<typeof screen>>, label: string) =>
  wrapper.findAll('button').find((button) => button.text() === label)!

/**
 * Le bouton de la confirmation, qui porte le **même libellé** que celui de la
 * ligne. Le chercher par son texte dans toute la page tomberait sur celui du
 * tableau, et le test validerait l'ouverture d'une boîte de dialogue au lieu
 * de l'envoi.
 */
const dialogButton = (wrapper: Awaited<ReturnType<typeof screen>>, label: string) =>
  wrapper
    .findComponent(PublicationDialog)
    .findAll('button')
    .find((button) => button.text() === label)!

beforeEach(() => {
  apiFetch.mockReset()
})

describe('the list', () => {
  it('shows each commune with the mode it is in', async () => {
    const wrapper = await screen([
      commune(),
      commune({ id: 'tenant-2', name: 'Dreux', status: 'community' }),
    ])

    expect(wrapper.text()).toContain('Senonches')
    expect(wrapper.text()).toContain('Silencieuse')
    expect(wrapper.text()).toContain('Publique')
  })

  it('offers to close a commune that is already open', async () => {
    const wrapper = await screen([commune({ status: 'community' })])

    expect(wrapper.text()).toContain('Refermer')
  })

  it('counts how many communes are open', async () => {
    const wrapper = await screen([
      commune(),
      commune({ id: 'tenant-2', status: 'community' }),
      commune({ id: 'tenant-3', status: 'community' }),
    ])

    expect(wrapper.text()).toContain('OUVERTES AU PUBLIC')
    expect(wrapper.html()).toContain('>2<')
  })
})

describe('opening a commune', () => {
  it('asks before anything leaves', async () => {
    const wrapper = await screen([commune()])
    apiFetch.mockClear()

    await rowButton(wrapper, 'Ouvrir au public').trigger('click')

    expect(wrapper.text()).toContain('Ouvrir Senonches au public')
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('sends the commune to the community status once confirmed', async () => {
    const wrapper = await screen([commune()])
    await rowButton(wrapper, 'Ouvrir au public').trigger('click')
    apiFetch.mockClear()
    apiFetch.mockResolvedValue([])

    await wrapper.find('input[type="text"]').setValue('Senonches')
    await dialogButton(wrapper, 'Ouvrir au public').trigger('click')
    await flushPromises()

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/tenant/tenant-1/status',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'community' }) })
    )
  })

  /** Refermer, c'est revenir au silence — pas à un autre état public. */
  it('sends a closing commune back to silence', async () => {
    const wrapper = await screen([commune({ status: 'community' })])
    await rowButton(wrapper, 'Refermer').trigger('click')
    apiFetch.mockClear()
    apiFetch.mockResolvedValue([])

    await wrapper.find('input[type="text"]').setValue('Senonches')
    await dialogButton(wrapper, 'Refermer').trigger('click')
    await flushPromises()

    expect(apiFetch).toHaveBeenCalledWith(
      '/api/tenant/tenant-1/status',
      expect.objectContaining({ body: JSON.stringify({ status: 'prospect' }) })
    )
  })

  /**
   * Les chiffres de l'écran viennent de changer : servir la réponse en cache
   * montrerait l'ancien état juste après le geste le plus lourd de l'écran.
   */
  it('reloads the list without the cache afterwards', async () => {
    const wrapper = await screen([commune()])
    await rowButton(wrapper, 'Ouvrir au public').trigger('click')
    await wrapper.find('input[type="text"]').setValue('Senonches')
    apiFetch.mockClear()
    apiFetch.mockResolvedValue([])

    await dialogButton(wrapper, 'Ouvrir au public').trigger('click')
    await flushPromises()

    const reload = apiFetch.mock.calls.find((call) => call[0] === '/api/tenant/prospects')
    expect(reload?.[1]?.cache).toBeUndefined()
  })
})

/** Une réponse inattendue doit vider l'écran, pas le casser. */
describe('a response that is not a list', () => {
  it('leaves the screen empty instead of throwing', async () => {
    const wrapper = await screen({} as never)

    expect(wrapper.text()).toContain('Aucune commune sans mairie')
  })
})
