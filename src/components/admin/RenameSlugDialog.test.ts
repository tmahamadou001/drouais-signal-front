import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import RenameSlugDialog from './RenameSlugDialog.vue'

const tenant = { id: 't1', name: 'Villemeux-sur-Eure', slug: 'villemeux-sur-eure-28415' }

const mountDialog = (props: Record<string, unknown> = {}) =>
  mount(RenameSlugDialog, {
    props: { tenant, submitting: false, error: null, ...props },
    global: { stubs: { AppIcon: true, Teleport: true, Transition: false } },
  })

describe('RenameSlugDialog', () => {
  it('proposes the slug without the INSEE code', () => {
    const wrapper = mountDialog()
    expect((wrapper.find('#rename-slug').element as HTMLInputElement).value).toBe('villemeux-sur-eure')
  })

  it('says the former address keeps working', () => {
    expect(mountDialog().text()).toContain("L’ancienne adresse continue de fonctionner")
  })

  it('emits the new slug on submit', async () => {
    const wrapper = mountDialog()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toEqual([['villemeux-sur-eure']])
  })

  it('does not submit an invalid slug, and says why', async () => {
    const wrapper = mountDialog()
    await wrapper.find('#rename-slug').setValue('Pas Valide')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('Minuscules, chiffres et tirets')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('does not submit a reserved slug', async () => {
    const wrapper = mountDialog()
    await wrapper.find('#rename-slug').setValue('api')
    expect(wrapper.text()).toContain('réservée')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('does not submit the address it already has', async () => {
    const wrapper = mountDialog({ tenant: { ...tenant, slug: 'la-loupe' } })
    expect(wrapper.text()).toContain('déjà l’adresse actuelle')
    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('shows the server refusal', () => {
    const wrapper = mountDialog({ error: 'Cette adresse est déjà utilisée, par une commune ou comme ancien nom.' })
    expect(wrapper.find('[role="alert"]').text()).toContain('déjà utilisée')
  })

  it('renders nothing without a commune', () => {
    expect(mountDialog({ tenant: null }).find('form').exists()).toBe(false)
  })
})
