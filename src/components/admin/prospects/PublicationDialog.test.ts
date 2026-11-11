import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PublicationDialog from './PublicationDialog.vue'
import type { Commune } from '@/lib/communePipeline'

/**
 * Le dernier verrou avant d'ouvrir une commune au public.
 *
 * Ce que ces tests tiennent, c'est qu'on ne puisse pas ouvrir par mégarde :
 * le geste ne se défait pas vraiment — refermer la page ne fait pas oublier ce
 * qui aura été vu — et il n'existe aucun écran pour s'en excuser après coup.
 */

const COMMUNE: Commune = {
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
  top_categories: [],
}

function dialog(props: Record<string, unknown> = {}) {
  return mount(PublicationDialog, {
    props: { commune: COMMUNE, opening: true, ...props },
    // `AppModal` se téléporte dans `body` : sans ce stub, le contenu n'est pas
    // dans l'arbre du composant monté et rien n'est trouvable.
    global: { stubs: { AppIcon: true, teleport: true } },
  })
}

const confirmButton = (wrapper: ReturnType<typeof dialog>) =>
  wrapper.findAll('button').find((button) => button.text().includes('Ouvrir'))
    ?? wrapper.findAll('button').find((button) => button.text().includes('Refermer'))!

describe('opening a commune', () => {
  it('says what becomes public, in figures', () => {
    expect(dialog().text()).toContain('20 signalements')
    expect(dialog().text()).toContain('15 photos')
  })

  it('warns that nobody on site can moderate', () => {
    expect(dialog().text()).toContain('Aucun agent de cette commune ne peut modérer')
  })

  it('says plainly that closing again repairs nothing', () => {
    expect(dialog().text()).toContain('ne fera pas disparaître ce qui aura été vu')
  })

  /** Le verrou : un clic ne suffit pas, il faut avoir recopié le nom. */
  it('does nothing when the name has not been typed', async () => {
    const wrapper = dialog()

    await confirmButton(wrapper).trigger('click')

    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  it('confirms once the name matches', async () => {
    const wrapper = dialog()

    await wrapper.find('input[type="text"]').setValue('senonches')
    await confirmButton(wrapper).trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })

  it('refuses a name that is almost right', async () => {
    const wrapper = dialog()

    await wrapper.find('input[type="text"]').setValue('Senonche')
    await confirmButton(wrapper).trigger('click')

    expect(wrapper.emitted('confirm')).toBeUndefined()
  })

  /** Les objections ne bloquent pas : elles se lisent. */
  it('shows the objections the figures raise, without blocking', async () => {
    const wrapper = dialog({
      commune: { ...COMMUNE, report_count: 2, with_photo_count: 0, account_count: 1, anonymous_count: 0 },
    })

    expect(wrapper.text()).toContain('presque vide')

    await wrapper.find('input[type="text"]').setValue('Senonches')
    await confirmButton(wrapper).trigger('click')

    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })
})

describe('closing a commune again', () => {
  const closing = () => dialog({ commune: { ...COMMUNE, status: 'community' }, opening: false })

  it('says reports leave the lists without being deleted', () => {
    expect(closing().text()).toContain('rien n’est supprimé')
  })

  it('raises no objection, since closing takes nothing away from the commune', () => {
    expect(closing().text()).not.toContain('presque vide')
  })

  /** Le même verrou : refermer une commune se fait aussi en connaissance de cause. */
  it('asks for the name as well', async () => {
    const wrapper = closing()

    await confirmButton(wrapper).trigger('click')
    expect(wrapper.emitted('confirm')).toBeUndefined()

    await wrapper.find('input[type="text"]').setValue('Senonches')
    await confirmButton(wrapper).trigger('click')
    expect(wrapper.emitted('confirm')).toHaveLength(1)
  })
})

describe('switching from one commune to another', () => {
  it('clears what was typed', async () => {
    const wrapper = dialog()
    await wrapper.find('input[type="text"]').setValue('Senonches')

    await wrapper.setProps({ commune: { ...COMMUNE, id: 'tenant-2', name: 'Dreux' } })

    expect((wrapper.find('input[type="text"]').element as HTMLInputElement).value).toBe('')
  })
})
