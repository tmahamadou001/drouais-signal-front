import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'

const { assign, directory, services } = vi.hoisted(() => ({
  assign: vi.fn(),
  directory: { members: { value: [] as any[] } },
  services: { value: [] as any[] },
}))

vi.mock('@/composables/useAssignment', async () => {
  const { ref } = await import('vue')
  return { useAssignment: () => ({ assign, saving: ref(false) }) }
})
vi.mock('@/composables/useTeamDirectory', async () => {
  const { ref, computed } = await import('vue')
  const members = ref<any[]>([])
  return {
    useTeamDirectory: () => {
      members.value = directory.members.value
      return { members, assignable: computed(() => members.value.filter((m) => m.role !== 'observer')), load: vi.fn(), nameOf: vi.fn() }
    },
  }
})
vi.mock('@/composables/useServices', async () => {
  const { ref } = await import('vue')
  return { useServices: () => ({ services: ref(services.value), load: vi.fn() }) }
})

import { useAuthStore } from '@/stores/auth'
import ReportAssignment from './ReportAssignment.vue'
import AssignDialog from './AssignDialog.vue'
import InternalThread from './InternalThread.vue'
import InternalComposer from './InternalComposer.vue'

const people = [
  { userId: 'julie', name: 'Julie Martin', role: 'admin' },
  { userId: 'marc', name: 'Marc Leroy', role: 'agent' },
  { userId: 'paul', name: 'Paul Durand', role: 'agent' },
  { userId: 'elu', name: 'Un élu', role: 'observer' },
]

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
  ;(useAuthStore() as any).user = { id: 'julie', email: 'julie@mairie.fr' }
  directory.members.value = people
  services.value = [{ id: 's1', name: 'Voirie', color: null }, { id: 's2', name: 'Propreté', color: null }]
  assign.mockResolvedValue({ assigneeId: 'marc', serviceId: null, changed: true, routed: false })
})

const stubs = { AppIcon: true, Teleport: true, Transition: false }

describe('ReportAssignment', () => {
  const none = { assignee: null, service: null, assignedAt: null, events: [] }

  it('says « À assigner » when nobody has the report, and offers to assign', () => {
    const wrapper = mount(ReportAssignment, { props: { team: none, canAct: true, closed: false }, global: { stubs } })

    expect(wrapper.find('[data-testid="to-assign"]').text()).toBe('À assigner')
    expect(wrapper.find('[data-testid="open-assign"]').text()).toBe('Assigner')
  })

  it('names the assignee and their service, and offers to change', () => {
    const wrapper = mount(ReportAssignment, {
      props: { team: { ...none, assignee: { id: 'marc', name: 'Marc Leroy' }, service: { id: 's1', name: 'Voirie' } }, canAct: true, closed: false },
      global: { stubs },
    })

    expect(wrapper.find('[data-testid="assignee-name"]').text()).toBe('Marc Leroy')
    expect(wrapper.text()).toContain('Service Voirie')
    expect(wrapper.find('[data-testid="open-assign"]').text()).toBe('Modifier')
  })

  it('says « Un ancien collègue » when the assignee left the team', () => {
    const wrapper = mount(ReportAssignment, {
      props: { team: { ...none, assignee: { id: 'x', name: null } }, canAct: true, closed: false }, global: { stubs },
    })
    expect(wrapper.find('[data-testid="assignee-name"]').text()).toBe('Un ancien collègue')
  })

  it('shows the information but no button to someone who cannot act', () => {
    const wrapper = mount(ReportAssignment, { props: { team: none, canAct: false, closed: false }, global: { stubs } })

    expect(wrapper.find('[data-testid="to-assign"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="open-assign"]').exists()).toBe(false)
  })

  it('has no button on a closed report, and does not flag it as waiting', () => {
    const wrapper = mount(ReportAssignment, { props: { team: none, canAct: true, closed: true }, global: { stubs } })
    expect(wrapper.find('[data-testid="open-assign"]').exists()).toBe(false)
    expect(wrapper.classes()).not.toContain('bg-status-pending-bg')
  })

  it('renders nothing until the server has answered', () => {
    expect(mount(ReportAssignment, { props: { team: null, canAct: true, closed: false }, global: { stubs } }).html()).toBe('<!--v-if-->')
  })
})

describe('AssignDialog', () => {
  const open = (props: Record<string, unknown> = {}) =>
    mount(AssignDialog, {
      props: { open: true, reportId: 'r1', categoryLabel: 'Voirie et chaussée', team: null, isAdmin: false, ...props },
      global: { stubs },
    })

  it('offers colleagues who can handle reports — never an observer — with me first', async () => {
    const wrapper = open()
    await nextTick()

    const ids = wrapper.findAll('[role="radio"]').map((radio) => radio.attributes('data-testid'))
    expect(ids).toEqual(['assign-julie', 'assign-marc', 'assign-paul'])
    expect(wrapper.find('[data-testid="assign-julie"]').text()).toContain('(moi)')
  })

  it('filters by name, accents and case aside', async () => {
    const wrapper = open()
    await nextTick()

    await wrapper.find('#assign-search').setValue('LERO')
    expect(wrapper.findAll('[role="radio"]')).toHaveLength(1)
  })

  it('cannot submit before choosing someone', async () => {
    const wrapper = open()
    await nextTick()
    expect(wrapper.find('[data-testid="submit-assign"]').attributes('disabled')).toBeDefined()
  })

  it('assigns the chosen person', async () => {
    const wrapper = open()
    await nextTick()

    await wrapper.find('[data-testid="assign-marc"]').trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(assign).toHaveBeenCalledWith('r1', { assigneeId: 'marc', serviceId: null, alsoRoute: false })
    expect(wrapper.emitted('assigned')).toHaveLength(1)
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('can attach a service on top', async () => {
    const wrapper = open()
    await nextTick()

    await wrapper.find('[data-testid="assign-marc"]').trigger('click')
    await wrapper.find('#assign-service').setValue('s2')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(assign).toHaveBeenCalledWith('r1', expect.objectContaining({ assigneeId: 'marc', serviceId: 's2' }))
  })

  it('offers « also route » to an administrator only', async () => {
    expect(open({ isAdmin: false }).find('[data-testid="also-route"]').exists()).toBe(false)

    const wrapper = open({ isAdmin: true })
    await nextTick()
    await wrapper.find('[data-testid="assign-marc"]').trigger('click')
    await wrapper.find('[data-testid="also-route"]').setValue(true)
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(assign).toHaveBeenCalledWith('r1', expect.objectContaining({ alsoRoute: true }))
  })

  it('never sends « also route » for an agent, even if the state were forced', async () => {
    const wrapper = open({ isAdmin: false })
    await nextTick()
    await wrapper.find('[data-testid="assign-marc"]').trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(assign).toHaveBeenCalledWith('r1', expect.objectContaining({ alsoRoute: false }))
  })

  it('starts on the current assignment and does not offer to re-assign the same', async () => {
    const wrapper = open({ team: { assignee: { id: 'marc', name: 'Marc Leroy' }, service: { id: 's1', name: 'Voirie' }, assignedAt: null, events: [] } })
    await nextTick()

    expect(wrapper.find('[data-testid="assign-marc"]').attributes('aria-checked')).toBe('true')
    expect(wrapper.find('[data-testid="submit-assign"]').attributes('disabled')).toBeDefined()
  })

  it('removes the assignment on demand', async () => {
    const wrapper = open({ team: { assignee: { id: 'marc', name: 'Marc Leroy' }, service: null, assignedAt: null, events: [] } })
    await nextTick()

    await wrapper.find('[data-testid="unassign"]').trigger('click')
    await flushPromises()

    expect(assign).toHaveBeenCalledWith('r1', { assigneeId: null, serviceId: null })
    expect(wrapper.emitted('assigned')).toHaveLength(1)
  })

  it('stays open when the server refuses', async () => {
    assign.mockResolvedValue(null)
    const wrapper = open()
    await nextTick()
    await wrapper.find('[data-testid="assign-marc"]').trigger('click')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.emitted('close')).toBeUndefined()
  })
})

describe('InternalThread', () => {
  const message = (id: string, content: string, name: string | null = 'Marc Leroy') => ({
    id, author_id: 'marc', author_name: name, content, mentions: [], created_at: '2026-11-22T10:00:00Z',
  })

  it('says who reads it — the question before writing something one would not tell a resident', () => {
    const wrapper = mount(InternalThread, { props: { messages: [], loading: false }, global: { stubs } })
    expect(wrapper.text()).toContain('Jamais envoyé à l’habitant')
  })

  it('explains the empty state', () => {
    expect(mount(InternalThread, { props: { messages: [], loading: false }, global: { stubs } }).text()).toContain('Aucun message interne')
  })

  it('lists messages with their author, and highlights the people cited', () => {
    const wrapper = mount(InternalThread, {
      props: { messages: [message('1', 'Peux-tu passer @Julie Martin ?'), message('2', 'ok', null)], loading: false },
      global: { stubs },
    })

    const cards = wrapper.findAll('[data-testid="internal-message"]')
    expect(cards).toHaveLength(2)
    expect(cards[0].text()).toContain('Marc Leroy')
    expect(cards[0].find('span.font-semibold').text()).toBe('@Julie Martin')
    expect(cards[1].text()).toContain('Un collègue')
  })

  it('treats a message as text, never as markup', () => {
    const wrapper = mount(InternalThread, { props: { messages: [message('1', '<img src=x onerror=alert(1)>')], loading: false }, global: { stubs } })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('<img src=x onerror=alert(1)>')
  })
})

describe('InternalComposer', () => {
  async function typeInto(wrapper: ReturnType<typeof mount>, value: string) {
    const field = wrapper.find('textarea')
    const element = field.element as HTMLTextAreaElement
    element.value = value
    element.setSelectionRange(value.length, value.length)
    await field.trigger('input')
  }

  const mountComposer = () => mount(InternalComposer, { props: { sending: false }, global: { stubs }, attachTo: document.body })

  it('opens the list of colleagues on @, and never lists an observer', async () => {
    const wrapper = mountComposer()
    await typeInto(wrapper, 'Salut @')

    const ids = wrapper.findAll('[role="option"]').map((option) => option.attributes('data-testid'))
    expect(ids).toEqual(['mention-julie', 'mention-marc', 'mention-paul'])
  })

  it('narrows the list as one types', async () => {
    const wrapper = mountComposer()
    await typeInto(wrapper, '@mar')

    expect(wrapper.findAll('[role="option"]').map((option) => option.text())).toEqual(['Julie Martin', 'Marc Leroy'])
  })

  it('does not open on an e-mail address', async () => {
    const wrapper = mountComposer()
    await typeInto(wrapper, 'écris à jean@mairie')
    expect(wrapper.find('[role="listbox"]').exists()).toBe(false)
  })

  it('inserts the full name on a click', async () => {
    const wrapper = mountComposer()
    await typeInto(wrapper, 'Salut @jul')

    await wrapper.find('[data-testid="mention-julie"]').trigger('mousedown')
    await nextTick()

    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('Salut @Julie Martin ')
  })

  it('moves with the arrows and picks with Enter — and Enter does not send while the list is open', async () => {
    const wrapper = mountComposer()
    await typeInto(wrapper, '@')

    await wrapper.find('textarea').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })
    await nextTick()

    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('@Marc Leroy ')
    expect(wrapper.emitted('send')).toBeUndefined()
  })

  it('sends the text with the ids of the people still named', async () => {
    const wrapper = mountComposer()
    await typeInto(wrapper, 'Salut @jul')
    await wrapper.find('[data-testid="mention-julie"]').trigger('mousedown')
    await nextTick()

    await wrapper.find('[data-testid="send-internal"]').trigger('click')

    expect(wrapper.emitted('send')![0]).toEqual(['Salut @Julie Martin', ['julie']])
  })

  it('drops a mention that was deleted after being chosen', async () => {
    const wrapper = mountComposer()
    await typeInto(wrapper, '@jul')
    await wrapper.find('[data-testid="mention-julie"]').trigger('mousedown')
    await nextTick()
    await typeInto(wrapper, 'finalement personne')

    await wrapper.find('[data-testid="send-internal"]').trigger('click')

    expect(wrapper.emitted('send')![0]).toEqual(['finalement personne', []])
  })

  it('sends on Enter and goes to the next line on Shift+Enter', async () => {
    const wrapper = mountComposer()
    await typeInto(wrapper, 'bonjour')

    await wrapper.find('textarea').trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(wrapper.emitted('send')).toBeUndefined()

    await wrapper.find('textarea').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('send')).toHaveLength(1)
  })

  it('refuses an empty message and one past 500 characters', async () => {
    const wrapper = mountComposer()
    expect(wrapper.find('[data-testid="send-internal"]').attributes('disabled')).toBeDefined()

    await typeInto(wrapper, 'x'.repeat(501))
    expect(wrapper.find('[data-testid="send-internal"]').attributes('disabled')).toBeDefined()

    await typeInto(wrapper, 'x'.repeat(500))
    expect(wrapper.find('[data-testid="send-internal"]').attributes('disabled')).toBeUndefined()
  })

  it('is emptied by reset()', async () => {
    const wrapper = mountComposer()
    await typeInto(wrapper, 'brouillon')
    ;(wrapper.vm as any).reset()
    await nextTick()

    expect((wrapper.find('textarea').element as HTMLTextAreaElement).value).toBe('')
  })
})


describe('ReportAssignment — votes des habitants', () => {
  const base = { assignee: null, service: null, assignedAt: null, events: [] }

  it('sums up what residents said, and stays silent when nobody voted', () => {
    const quiet = mount(ReportAssignment, { props: { team: { ...base, votes: { toujours_la: 0, plus_la: 0, suivre: 0, merci: 0 } }, canAct: true, closed: false }, global: { stubs } })
    expect(quiet.find('[data-testid="votes-line"]').exists()).toBe(false)

    const wrapper = mount(ReportAssignment, { props: { team: { ...base, votes: { toujours_la: 4, plus_la: 1, suivre: 3, merci: 2 } }, canAct: true, closed: false }, global: { stubs } })
    expect(wrapper.find('[data-testid="votes-line"]').text()).toBe('Habitants : 4 toujours là · 1 plus là · 3 suivent · 2 mercis')
  })
})

describe('membres sans nom — mentions', () => {
  const anon = { userId: 'anon', name: null, email: 'sans-nom@exemple.fr', role: 'agent' }

  it('can be cited by e-mail address: a member who was never named still has an account and alerts', async () => {
    directory.members.value = [...people, anon]
    const wrapper = mount(InternalComposer, { props: { sending: false }, global: { stubs }, attachTo: document.body })
    const field = wrapper.find('textarea')
    const element = field.element as HTMLTextAreaElement
    element.value = 'Salut @sans'
    element.setSelectionRange(11, 11)
    await field.trigger('input')

    expect(wrapper.findAll('[role="option"]').map((option) => option.text())).toEqual(['sans-nom@exemple.fr'])
    await wrapper.find('[data-testid="mention-anon"]').trigger('mousedown')
    await nextTick()
    expect(element.value).toBe('Salut @sans-nom@exemple.fr ')
  })

  it('highlights such a mention in the thread, like any other', () => {
    directory.members.value = [...people, anon]
    const wrapper = mount(InternalThread, {
      props: { messages: [{ id: '1', author_id: 'marc', author_name: 'Marc Leroy', content: 'Peux-tu voir @sans-nom@exemple.fr ?', mentions: [], created_at: '2026-11-22T10:00:00Z' }], loading: false },
      global: { stubs },
    })
    expect(wrapper.find('span.font-semibold').text()).toBe('@sans-nom@exemple.fr')
  })

  it('shows the address of an author the server could only name by it', () => {
    const wrapper = mount(InternalThread, {
      props: { messages: [{ id: '1', author_id: 'anon', author_name: 'sans-nom@exemple.fr', content: 'ok', mentions: [], created_at: '2026-11-22T10:00:00Z' }], loading: false },
      global: { stubs },
    })
    expect(wrapper.find('[data-testid="internal-message"]').text()).toContain('sans-nom@exemple.fr')
  })
})
