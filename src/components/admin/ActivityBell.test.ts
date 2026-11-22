import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

const { push, items, unread, markRead, markAllRead } = vi.hoisted(() => ({
  push: vi.fn(),
  items: { value: [] as any[] },
  unread: { value: 0 },
  markRead: vi.fn(),
  markAllRead: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/composables/useActivity', async () => {
  const { ref } = await import('vue')
  return {
    useActivity: () => ({
      items: Object.assign(ref(items.value), { get value() { return items.value } }),
      unread: Object.assign(ref(unread.value), { get value() { return unread.value } }),
      markRead,
      markAllRead,
    }),
  }
})

import ActivityBell from './ActivityBell.vue'

const row = (id: string, overrides: Record<string, unknown> = {}) => ({
  id, kind: 'mention', reportId: 'r1', reportTitle: 'Nid-de-poule', reportReference: 'LAL-2026-00001',
  actorName: 'Marc Leroy', excerpt: 'Julie, peux-tu passer ?', readAt: null, createdAt: new Date().toISOString(), ...overrides,
})

function mountBell() {
  return mount(ActivityBell, { global: { stubs: { AppIcon: true } }, attachTo: document.body })
}

beforeEach(() => {
  vi.clearAllMocks()
  items.value = []
  unread.value = 0
  document.body.innerHTML = ''
})

describe('ActivityBell', () => {
  it('shows no badge when nothing is unread', () => {
    expect(mountBell().find('[data-testid="activity-badge"]').exists()).toBe(false)
  })

  it('shows the unread count, capped at 9+', async () => {
    unread.value = 3
    expect(mountBell().find('[data-testid="activity-badge"]').text()).toBe('3')

    unread.value = 14
    expect(mountBell().find('[data-testid="activity-badge"]').text()).toBe('9+')
  })

  it('opens an explanatory empty state', async () => {
    const wrapper = mountBell()
    await wrapper.find('[data-testid="activity-bell"]').trigger('click')

    expect(wrapper.find('[data-testid="activity-panel"]').text()).toContain('Rien pour l’instant')
  })

  it('lists what concerns me, unread first-class, with its excerpt', async () => {
    items.value = [row('a'), row('b', { kind: 'assigned', actorName: null, excerpt: 'Nid-de-poule', readAt: '2026-11-22T10:00:00Z' })]
    unread.value = 1
    const wrapper = mountBell()
    await wrapper.find('[data-testid="activity-bell"]').trigger('click')

    const rows = wrapper.findAll('[role="menuitem"]')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Marc Leroy vous a mentionné')
    expect(rows[0].text()).toContain('LAL-2026-00001 · Nid-de-poule')
    expect(rows[0].text()).toContain('Julie, peux-tu passer ?')
    expect(rows[0].attributes('data-unread')).toBe('true')
    expect(rows[1].attributes('data-unread')).toBe('false')
    expect(rows[1].text()).toContain('Un signalement vous a été confié')
  })

  it('does not mark anything read just by opening', async () => {
    items.value = [row('a')]
    unread.value = 1
    const wrapper = mountBell()
    await wrapper.find('[data-testid="activity-bell"]').trigger('click')

    expect(markRead).not.toHaveBeenCalled()
    expect(markAllRead).not.toHaveBeenCalled()
  })

  it('reads a row and goes to its report: a mention lands on the internal thread', async () => {
    items.value = [row('a')]
    const wrapper = mountBell()
    await wrapper.find('[data-testid="activity-bell"]').trigger('click')
    await wrapper.find('[role="menuitem"]').trigger('click')

    expect(markRead).toHaveBeenCalledWith('a')
    expect(push).toHaveBeenCalledWith({ name: 'AdminReports', query: { open: 'r1', view: 'messages', tab: 'internal' } })
    expect(wrapper.find('[data-testid="activity-panel"]').exists()).toBe(false)
  })

  it('sends a citizen reply to the citizen thread and an assignment to the overview', async () => {
    items.value = [row('a', { kind: 'citizen_reply' }), row('b', { kind: 'assigned' })]
    const wrapper = mountBell()
    await wrapper.find('[data-testid="activity-bell"]').trigger('click')

    await wrapper.findAll('[role="menuitem"]')[0].trigger('click')
    expect(push).toHaveBeenLastCalledWith({ name: 'AdminReports', query: { open: 'r1', view: 'messages', tab: 'citizen' } })

    await wrapper.find('[data-testid="activity-bell"]').trigger('click')
    await wrapper.findAll('[role="menuitem"]')[1].trigger('click')
    expect(push).toHaveBeenLastCalledWith({ name: 'AdminReports', query: { open: 'r1', view: 'overview', tab: undefined } })
  })

  it('offers « mark all read » only when something is unread', async () => {
    items.value = [row('a')]
    unread.value = 0
    let wrapper = mountBell()
    await wrapper.find('[data-testid="activity-bell"]').trigger('click')
    expect(wrapper.find('[data-testid="activity-read-all"]').exists()).toBe(false)

    unread.value = 1
    wrapper = mountBell()
    await wrapper.find('[data-testid="activity-bell"]').trigger('click')
    await wrapper.find('[data-testid="activity-read-all"]').trigger('click')
    expect(markAllRead).toHaveBeenCalled()
  })

  it('closes on a click outside', async () => {
    const wrapper = mountBell()
    await wrapper.find('[data-testid="activity-bell"]').trigger('click')
    expect(wrapper.find('[data-testid="activity-panel"]').exists()).toBe(true)

    document.body.click()
    await flushPromises()
    expect(wrapper.find('[data-testid="activity-panel"]').exists()).toBe(false)
  })

  it('closes on Escape', async () => {
    const wrapper = mount(ActivityBell, { attachTo: document.body, global: { stubs: { AppIcon: true } } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.find('[role="dialog"], [data-testid="activity-panel"]').exists() || wrapper.html().includes('Activité')).toBe(true)

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.find('button').attributes('aria-expanded')).toBe('false')
    wrapper.unmount()
  })
})
