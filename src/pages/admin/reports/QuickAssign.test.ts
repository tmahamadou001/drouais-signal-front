import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'

const assign = vi.hoisted(() => vi.fn())
const members = vi.hoisted(() => [
  { userId: 'u-julie', name: 'Julie Martin', role: 'agent' },
  { userId: 'u-me', name: 'Nadia Lefèvre', role: 'agent' },
  { userId: 'u-marc', name: 'Marc Leroy', role: 'admin' },
])

vi.mock('@/composables/useAssignment', () => ({ useAssignment: () => ({ assign, saving: ref(false) }) }))
vi.mock('@/composables/useTeamDirectory', () => ({ useTeamDirectory: () => ({ assignable: ref(members), load: vi.fn() }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: { id: 'u-me' } }) }))

import QuickAssign from './QuickAssign.vue'

const make = (report: Record<string, unknown> = {}, enabled = true) =>
  mount(QuickAssign, { props: { report: { id: 'r1', status: 'en_attente', assignee_id: null, service_id: 's1', ...report } as never, enabled }, slots: { default: '<span data-testid="cell">À assigner</span>' }, global: { stubs: { AppIcon: true } }, attachTo: document.body })

beforeEach(() => { vi.clearAllMocks(); assign.mockResolvedValue({ changed: true }); document.body.innerHTML = '' })

describe('QuickAssign — un seul menu à la fois', () => {
  it('closes the first menu when another cell opens its own', async () => {
    const first = make({ id: 'r1' })
    const second = make({ id: 'r2' })

    await first.get('[data-testid="quick-assign"]').trigger('click')
    expect(document.body.querySelectorAll('[data-testid="quick-assign-menu"]')).toHaveLength(1)

    await second.get('[data-testid="quick-assign"]').trigger('click')
    expect(document.body.querySelectorAll('[data-testid="quick-assign-menu"]')).toHaveLength(1)

    // Et c'est celui de la seconde cellule qui reste.
    ;(document.body.querySelector('[data-testid="quick-assign-u-julie"]') as HTMLElement).click()
    await flushPromises()
    expect(assign).toHaveBeenCalledWith('r2', { assigneeId: 'u-julie' })
    first.unmount()
    second.unmount()
  })

  it('does not leave a menu behind when its row disappears from the table', async () => {
    const wrapper = make({ id: 'r1' })
    await wrapper.get('[data-testid="quick-assign"]').trigger('click')
    wrapper.unmount()
    document.body.innerHTML = ''

    const next = make({ id: 'r2' })
    await next.get('[data-testid="quick-assign"]').trigger('click')
    expect(document.body.querySelectorAll('[data-testid="quick-assign-menu"]')).toHaveLength(1)
    next.unmount()
  })

  it('a second click on the same cell closes its menu', async () => {
    const wrapper = make({ id: 'r1' })
    await wrapper.get('[data-testid="quick-assign"]').trigger('click')
    await wrapper.get('[data-testid="quick-assign"]').trigger('click')
    expect(document.body.querySelector('[data-testid="quick-assign-menu"]')).toBeNull()
    wrapper.unmount()
  })
})

describe('QuickAssign', () => {
  it('is only the cell when nobody may assign — an observer, a closed report', () => {
    const wrapper = make({}, false)
    expect(wrapper.find('[data-testid="quick-assign"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="cell"]').exists()).toBe(true)
  })

  it('opens on a click on the cell, listing myself first', async () => {
    const wrapper = make()
    await wrapper.get('[data-testid="quick-assign"]').trigger('click')
    const items = [...document.body.querySelectorAll('[data-testid^="quick-assign-u-"]')].map((node) => node.textContent?.trim())
    expect(items[0]).toContain('Nadia Lefèvre')
    expect(items[0]).toContain('Moi')
    expect(items).toHaveLength(3)
    wrapper.unmount()
  })

  it('assigns the chosen person in one click — and leaves the service alone', async () => {
    const wrapper = make()
    await wrapper.get('[data-testid="quick-assign"]').trigger('click')
    ;(document.body.querySelector('[data-testid="quick-assign-u-julie"]') as HTMLElement).click()
    await flushPromises()

    // Seule la personne est envoyée : un `serviceId` absent veut dire « n'y touche pas ».
    expect(assign).toHaveBeenCalledWith('r1', { assigneeId: 'u-julie' })
    expect(wrapper.emitted('assigned')).toHaveLength(1)
    expect(document.body.querySelector('[data-testid="quick-assign-menu"]')).toBeNull()
    wrapper.unmount()
  })

  it('does not tell the table the report moved when the server refused', async () => {
    assign.mockResolvedValue(null)
    const wrapper = make()
    await wrapper.get('[data-testid="quick-assign"]').trigger('click')
    ;(document.body.querySelector('[data-testid="quick-assign-u-marc"]') as HTMLElement).click()
    await flushPromises()
    expect(wrapper.emitted('assigned')).toBeUndefined()
    wrapper.unmount()
  })

  it('offers to put it back « à assigner » only when someone has it', async () => {
    const free = make()
    await free.get('[data-testid="quick-assign"]').trigger('click')
    expect(document.body.querySelector('[data-testid="quick-unassign"]')).toBeNull()
    free.unmount()
    document.body.innerHTML = ''

    const taken = make({ assignee_id: 'u-julie' })
    await taken.get('[data-testid="quick-assign"]').trigger('click')
    ;(document.body.querySelector('[data-testid="quick-unassign"]') as HTMLElement).click()
    await flushPromises()
    expect(assign).toHaveBeenCalledWith('r1', { assigneeId: null })
    taken.unmount()
  })

  it('closes on Escape and on a click elsewhere, but not on a click inside its own menu', async () => {
    const wrapper = make()
    await wrapper.get('[data-testid="quick-assign"]').trigger('click')
    ;(document.body.querySelector('[data-testid="quick-assign-menu"]') as HTMLElement).click()
    expect(document.body.querySelector('[data-testid="quick-assign-menu"]')).not.toBeNull()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('[data-testid="quick-assign-menu"]')).toBeNull()
    wrapper.unmount()
  })
})
