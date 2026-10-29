import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, enableAutoUnmount } from '@vue/test-utils'
import { ref, nextTick } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { useTenantStore } from '@/stores/tenant'
import { useAuthStore } from '@/stores/auth'

const { apiFetch, loadComments, postAgentMessage, state } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  loadComments: vi.fn(),
  postAgentMessage: vi.fn(),
  // Filled in below with real refs — `vi.hoisted` runs before the Vue import.
  state: {} as { comments: any; loading: any; sending: any },
}))

state.comments = ref<any[]>([])
state.loading = ref(false)
state.sending = ref(false)

vi.mock('@/composables/useApi', () => ({
  useApi: () => ({ apiFetch, invalidateCache: vi.fn(), invalidateCachePattern: vi.fn() }),
}))

vi.mock('@/composables/useReportComments', () => ({
  useReportComments: () => ({
    comments: state.comments,
    loading: state.loading,
    sending: state.sending,
    error: ref(null),
    load: loadComments,
    postAgentMessage,
  }),
}))

vi.mock('@/components/admin/TransmitDialog.vue', () => ({
  default: { props: ['open'], template: '<div />' },
}))

vi.mock('@/composables/usePhotoUpload', () => ({
  usePhotoUpload: () => ({ uploading: ref(false), uploadResolutionPhoto: vi.fn() }),
}))

import ReportDetailSidebar from './ReportDetailSidebar.vue'
import type { Report } from '@/types'

const HOUR = 3600_000
const DAY = 24 * HOUR

function report(overrides: Partial<Report> = {}): Report {
  return {
    id: 'ab12cd34-5678-90ef-1234-56789abcdef0',
    reference: 'LAL-2026-00418',
    title: 'Lampadaire éteint rue de la Gare',
    category: 'mobilier',
    description: 'Le lampadaire ne s’allume plus.',
    photo_url: null,
    lat: 48.47,
    lng: 1.0,
    address_approx: '2 Rue de la Gare, 28240 La Loupe',
    status: 'en_attente' as const,
    user_id: 'u1',
    vote_count: 1,
    ai_assisted: false,
    created_at: new Date(Date.now() - 11 * DAY).toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function sidebar(props: Record<string, unknown> = {}) {
  return mount(ReportDetailSidebar, {
    props: { open: true, report: report(), ...props },
    global: {
      stubs: { AppIcon: true, MapView: true, PhotoLightbox: true, Teleport: true },
    },
  })
}

/**
 * The panel opened on its conversation.
 *
 * The journal and the thread are two unbounded lists that no longer share one
 * scroll: the rail separates them, so a test about messages has to say which
 * view it is looking at — exactly as the bell does when it opens a report
 * because somebody replied.
 */
function conversation(props: Record<string, unknown> = {}) {
  return sidebar({ initialView: 'messages', ...props })
}

enableAutoUnmount(afterEach)

beforeEach(() => {
  setActivePinia(createPinia())

  // Most of this file exercises what an agent does; the rail and the footer
  // only exist for someone who can act. The observer case has its own block.
  useAuthStore().role = 'admin'

  const tenant = useTenantStore()
  tenant.data = {
    slug: 'la-loupe',
    name: 'La Loupe',
    categories: [
      { slug: 'mobilier', label: 'Éclairage', icon: '💡', color: null, description: '', is_active: true, sort_order: 0, sla_hours: 48 },
    ],
  } as any

  vi.clearAllMocks()
  state.comments.value = []
  apiFetch.mockResolvedValue({ history: [], contact: { channel: 'email', reachable: true } })
})

/**
 * `GET /comments` answers threads: each agent message carries the resident's
 * answers in `replies`.
 */
function thread(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    authorType: 'agent',
    content: 'Une vérification est programmée.',
    photoUrl: null,
    createdAt: '2026-09-04T00:32:00.000Z',
    author: { email: 'thomas@mairie.fr' },
    replies: [],
    ...overrides,
  }
}

describe('reference', () => {
  /**
   * An agent on the phone with a resident needs something they can read out.
   * It comes from the database (migration 032) rather than being recomputed
   * here: it is dictated, printed and pasted into e-mails, so it may never
   * change under anyone's feet.
   */
  it('shows the reference the database assigned', () => {
    expect(sidebar().text()).toContain('LAL-2026-00418')
  })
})

describe('delay', () => {
  it('names the SLA of the category, not a single threshold', () => {
    expect(sidebar().text()).toContain('48 h à compter du dépôt')
  })

  /**
   * "Overdue" does not say whether to go today. "Overdue by 9 days" does.
   */
  it('counts the days past the deadline', () => {
    // Filed 11 days ago, 48 h target: 9 days late.
    expect(sidebar().text()).toContain('En retard de 9 j')
  })

  /**
   * The deadline sits beside the SLA that produces it, not in the trail header
   * three hundred pixels from the "overdue" pill it causes.
   */
  it('says nothing about a delay that is still held, but still dates it', () => {
    const wrapper = sidebar({ report: report({ created_at: new Date(Date.now() - HOUR).toISOString() }) })

    expect(wrapper.text()).not.toContain('En retard')
    expect(wrapper.text()).not.toContain('dépassée')
    expect(wrapper.text()).toContain('Échéance')
  })

  it('never calls a resolved report overdue, however old', () => {
    const wrapper = sidebar({ report: report({ status: 'resolu' }) })

    expect(wrapper.text()).not.toContain('En retard')
  })
})

describe('actions', () => {
  it('offers to take charge of a waiting report', () => {
    expect(sidebar().text()).toContain('Prendre en charge')
  })

  it('emits the next status', async () => {
    const wrapper = sidebar()
    await wrapper.findAll('button').find((button) => button.text().includes('Prendre en charge'))!.trigger('click')

    expect(wrapper.emitted('updateStatus')?.[0]).toEqual([report().id, 'pris_en_charge', undefined])
  })

  /**
   * Resolving tells the citizen it is done. Taking that back silently would
   * make the promise something the commune can withdraw, so the status is
   * final — and the panel says so instead of showing buttons that would fail.
   */
  it('offers nothing on a resolved report, and says why', () => {
    const wrapper = sidebar({ report: report({ status: 'resolu' }) })

    expect(wrapper.text()).toContain('n’est plus modifiable')
    expect(wrapper.text()).not.toContain('Prendre en charge')
    expect(wrapper.text()).not.toContain('Revenir à une étape précédente')
  })

  /**
   * Clicking the wrong row used to have no remedy: the only way out was to
   * delete the report, losing its history and leaving the citizen unanswered.
   */
  it('offers a rollback on a report in progress', async () => {
    const wrapper = sidebar({ report: report({ status: 'pris_en_charge' }) })

    expect(wrapper.text()).toContain('Revenir à une étape précédente')

    await wrapper.findAll('button').find((button) => button.text().includes('Revenir à'))!.trigger('click')
    await wrapper.findAll('button').find((button) => button.text() === 'En attente')!.trigger('click')

    expect(wrapper.emitted('updateStatus')?.[0]).toEqual([
      report().id, 'en_attente', 'Retour à « En attente »',
    ])
  })

  /** Resolving is the one gesture that cannot be undone: it asks first. */
  it('confirms before resolving', async () => {
    const wrapper = sidebar({ report: report({ status: 'pris_en_charge' }) })

    await wrapper.findAll('button').find((button) => button.text().includes('Marquer résolu'))!.trigger('click')

    expect(wrapper.emitted('updateStatus')).toBeUndefined()
    expect(wrapper.text()).toContain('ne pourra plus être modifié')
  })

  it('disables stepping when there is nothing before or after', () => {
    const wrapper = sidebar({ hasPrevious: false, hasNext: true })
    const [previous, next] = wrapper.findAll('button[title$="précédent"], button[title$="suivant"]')

    expect(previous.attributes('disabled')).toBeDefined()
    expect(next.attributes('disabled')).toBeUndefined()
  })
})

describe('conversation', () => {
  it('shows the commune message and the resident answer, not just the first', () => {
    state.comments.value = [thread({
      replies: [{
        id: 'r1',
        authorType: 'citizen',
        content: 'Toujours éteint ce soir.',
        photoUrl: null,
        createdAt: '2026-09-04T00:49:00.000Z',
        replies: [],
      }],
    })]

    const wrapper = conversation()

    expect(wrapper.text()).toContain('Une vérification est programmée.')
    expect(wrapper.text()).toContain('Toujours éteint ce soir.')
    expect(wrapper.text()).toContain('2 messages')
  })

  it('tells the two sides apart', () => {
    state.comments.value = [thread({
      replies: [{ id: 'r1', authorType: 'citizen', content: 'Merci.', photoUrl: null, createdAt: '2026-09-04T00:49:00.000Z', replies: [] }],
    })]

    const wrapper = conversation()

    expect(wrapper.text()).toContain('Habitant')
    expect(wrapper.text()).toContain('Service')
  })

  it('names the agent from their address rather than showing an id', () => {
    state.comments.value = [thread()]

    expect(conversation().text()).toContain('thomas')
  })

  it('invites a first message when the thread is empty', () => {
    expect(conversation().text()).toContain('Aucun échange')
  })
})

describe('transmitting', () => {
  /**
   * Forwarding was a side effect of creation, so it could never be triggered
   * later — when a recipient is configured after the fact, when an agent
   * decides it belongs to the works department, or when the first send bounced.
   */
  it('offers to forward a report that is still open', async () => {
    const wrapper = sidebar()
    await flushPromises()

    expect(wrapper.text()).toContain('Transmettre')
  })

  it('names the service when the category already knows one', async () => {
    const tenant = useTenantStore()
    tenant.data = {
      ...(tenant.data as any),
      categories: [{ ...(tenant.data as any).categories[0], service_emails: ['regie@mairie.fr'] }],
    } as any

    const wrapper = sidebar()
    await flushPromises()

    expect(wrapper.text()).toContain('Transmettre à ce service')
  })

  it('asks where to send when nothing is configured', async () => {
    const wrapper = sidebar()
    await flushPromises()

    expect(wrapper.text()).toContain('Transmettre à un service…')
  })

  /**
   * A resolved report has nowhere to go. Offering the button would suggest the
   * commune can still delegate something it has already closed.
   */
  it('stops offering it once the report is resolved', async () => {
    const wrapper = sidebar({ report: report({ status: 'resolu' }) })
    await flushPromises()

    expect(wrapper.text()).not.toContain('Transmettre')
  })
})

describe('the trail', () => {
  /**
   * "Transmis" is a branch, not a stage. A report whose category has no
   * recipient is handled in-house and never goes through it — showing the step
   * anyway made the agent click "Prendre en charge" and watch a step they never
   * took mark itself as done.
   */
  it('hides the forwarded step on a report that was never forwarded', async () => {
    const wrapper = sidebar()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Transmis')
  })

  it('shows it on a report currently forwarded', async () => {
    const wrapper = sidebar({ report: report({ status: 'transmis' }) })
    await flushPromises()

    expect(wrapper.text()).toContain('Transmis')
  })

  it('keeps it once it happened, even after an agent took over', async () => {
    apiFetch.mockResolvedValue({
      history: [{ id: 'h1', new_status: 'transmis', old_status: 'en_attente', changed_at: '2026-09-10T10:00:00.000Z' }],
      contact: { channel: 'email', reachable: true },
    })

    const wrapper = sidebar({ report: report({ status: 'pris_en_charge' }) })
    await flushPromises()

    expect(wrapper.text()).toContain('Transmis')
  })

  /**
   * A forwarded report is waiting on a third party. An agent has to be able to
   * take it back — that is the whole point of the intermediate state.
   */
  it('lets an agent take over a forwarded report', async () => {
    const wrapper = sidebar({ report: report({ status: 'transmis' }) })
    await flushPromises()

    expect(wrapper.text()).toContain('Prendre en charge')
  })
})

describe('reaching the resident', () => {
  /**
   * Writing into the void is this screen's most expensive failure: the agent
   * believes they answered, the resident got nothing, and nothing says so.
   */
  it('warns when nobody can be notified', async () => {
    apiFetch.mockResolvedValue({ history: [], contact: { channel: 'none', reachable: false } })

    const wrapper = conversation()
    await flushPromises()

    expect(wrapper.text()).toContain('aucun moyen de contact')
    expect(wrapper.text()).toContain('ne le verra que')
  })

  it('stays quiet when the resident can be reached', async () => {
    const wrapper = conversation()
    await flushPromises()

    expect(wrapper.text()).not.toContain('ne le verra que')
  })

  /**
   * The channel is on the report card, not above the composer: it says what
   * the report *is*, and an agent reads it before deciding to write at all.
   */
  it('names the channel on the report card', async () => {
    const wrapper = sidebar()
    await flushPromises()

    expect(wrapper.text()).toContain('joignable par e-mail')
  })

  it('tells an account apart from an address left at filing time', async () => {
    apiFetch.mockResolvedValue({ history: [], contact: { channel: 'account', reachable: true } })

    const wrapper = sidebar()
    await flushPromises()

    expect(wrapper.text()).toContain('Compte OnSignale')
  })

  /**
   * A warning shown on a guess would be worse than none: it would teach agents
   * to ignore it.
   */
  it('says nothing at all when the server did not answer', async () => {
    apiFetch.mockRejectedValue(new Error('offline'))

    const wrapper = conversation()
    await flushPromises()

    expect(wrapper.text()).not.toContain('aucun moyen de contact')
    expect(wrapper.text()).not.toContain('joignable')
  })
})

describe('missing pieces', () => {
  it('says a photo was never sent rather than showing a broken frame', () => {
    expect(sidebar().text()).toContain('Aucune photo')
  })

  it('explains an empty description instead of leaving a gap', () => {
    const wrapper = sidebar({ report: report({ description: null }) })

    expect(wrapper.text()).toContain('Aucune description')
  })

  it('loads the history and the conversation of the report it opens on', () => {
    sidebar()

    expect(apiFetch).toHaveBeenCalledWith(`/api/reports/${report().id}`)
    expect(loadComments).toHaveBeenCalled()
  })
})

/**
 * The panel used to stack two unbounded lists — the journal and the thread —
 * in a single scroll. At six messages and three status changes it took two
 * thousand pixels of scrolling to reach the resident's reply, which is the one
 * thing an agent comes here to do. The rail separates them.
 */
describe('the rail', () => {
  it('opens on the report card, not on a list', async () => {
    const wrapper = sidebar()
    await flushPromises()

    expect(wrapper.text()).toContain('DESCRIPTION DE L’HABITANT')
    expect(wrapper.text()).not.toContain('ÉCHANGES AVEC L’HABITANT')
  })

  it('shows one list at a time', async () => {
    const wrapper = conversation()
    await flushPromises()

    expect(wrapper.text()).toContain('ÉCHANGES AVEC L’HABITANT')
    expect(wrapper.text()).not.toContain('DESCRIPTION DE L’HABITANT')
  })

  it('shows the journal skeleton before the history has landed', async () => {
    // The empty state used to show during the request: "no status change yet"
    // is a false sentence, displayed at the exact moment an agent is waiting
    // to read one. An empty state is not a loading state.
    let release: (value: unknown) => void = () => {}
    apiFetch.mockImplementationOnce(() => new Promise((resolve) => { release = resolve }))

    const wrapper = sidebar({ initialView: 'journal' })
    await nextTick()

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Aucun changement de statut pour l’instant')

    release({ report: report(), history: [], contact: { channel: 'none', reachable: false } })
    await flushPromises()

    expect(wrapper.find('[aria-busy="true"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Aucun changement de statut pour l’instant')
  })

  it('switches view on click', async () => {
    const wrapper = sidebar()
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text() === 'Journal')!.trigger('click')

    expect(wrapper.text()).toContain('Aucun changement de statut pour l’instant')
    expect(wrapper.text()).not.toContain('DESCRIPTION DE L’HABITANT')
  })

  /**
   * An agent reading "it's fixed, thanks" must be able to close from there.
   * Sending them back to the report card for that would be the mistake the
   * partitioning invents.
   */
  it('keeps the status actions on every view', async () => {
    const wrapper = sidebar()
    await flushPromises()
    expect(wrapper.text()).toContain('Prendre en charge')

    await wrapper.findAll('button').find((button) => button.text() === 'Journal')!.trigger('click')
    expect(wrapper.text()).toContain('Prendre en charge')
  })

  /** The composer belongs to the conversation: under a journal it has no subject. */
  it('shows the composer only on the conversation', async () => {
    const wrapper = sidebar()
    await flushPromises()
    expect(wrapper.text()).not.toContain('Joindre une photo')

    await wrapper.findAll('button').find((button) => button.text() === 'Échanges')!.trigger('click')
    expect(wrapper.text()).toContain('Joindre une photo')
  })

  /** What makes the partitioning bearable: you see something happened elsewhere. */
  it('badges unread replies without having to open the thread', async () => {
    const wrapper = sidebar({ unread: 3 })
    await flushPromises()

    expect(wrapper.text()).toContain('3')
  })

  /**
   * Staying on "Journal" while stepping to the next report would open on an
   * empty list nine times out of ten, and suggest the new report has no
   * history when we are simply looking in the wrong place.
   */
  it('returns to the report card when stepping to another report', async () => {
    const wrapper = sidebar()
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text() === 'Journal')!.trigger('click')
    expect(wrapper.text()).not.toContain('DESCRIPTION DE L’HABITANT')

    await wrapper.setProps({ report: report({ id: 'another-report' }) })
    await flushPromises()

    expect(wrapper.text()).toContain('DESCRIPTION DE L’HABITANT')
  })
})

describe('the report card', () => {
  /**
   * The photo already enlarged on click, but only a `title` said so — which is
   * discovered by resting on it by accident. A zoom cursor and a hover veil
   * announce it before the attempt.
   */
  it('opens the photo full size, and looks clickable', async () => {
    const wrapper = sidebar({ report: report({ photo_url: 'https://example.test/photo.jpg' }) })
    const photo = wrapper.find('button[title="Agrandir la photo"]')

    expect(photo.exists()).toBe(true)
    expect(photo.classes()).toContain('cursor-zoom-in')
    // A thumbnail, not a banner: it enlarges on click, so it does not need the
    // width — and the space saved keeps the whole identity above the fold.
    expect(photo.classes()).toContain('w-[152px]')

    await photo.trigger('click')
    expect(wrapper.findComponent({ name: 'PhotoLightbox' }).props('open')).toBe(true)
  })

  /** Nothing to click when there is nothing to enlarge. */
  it('says a photo was never sent rather than offering an empty frame', () => {
    const wrapper = sidebar()

    expect(wrapper.text()).toContain('Aucune photo transmise')
    expect(wrapper.find('button[title="Agrandir la photo"]').exists()).toBe(false)
  })

  /**
   * An agent opening this panel sometimes leaves for the site. The route
   * existed on the external-service screen and was missing from the one place
   * municipal agents actually pass through.
   */
  it('offers a route to the position', () => {
    const link = sidebar().find('a[href*="google.com/maps"]')

    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toContain('48.47,1')
    expect(link.attributes('rel')).toContain('noopener')
  })

  /**
   * The address reads twice on purpose: in the facts, where it is read with
   * the rest of what is known about the report, and under the map, where it
   * captions the marker.
   */
  it('gives the address with the facts, not only under the map', () => {
    const wrapper = sidebar()
    const facts = wrapper.find('dl')

    expect(facts.text()).toContain('Adresse')
    expect(facts.text()).toContain('2 Rue de la Gare, 28240 La Loupe')
  })

  /**
   * Identity first — status, title, facts beside the thumbnail — then trail,
   * description and map stacked full width.
   */
  it('lays the blocks out in the order they are read', () => {
    const text = sidebar({ report: report({ photo_url: 'https://example.test/photo.jpg' }) }).text()
    const order = ['En attente', 'Lampadaire éteint', 'Catégorie', 'SUIVI', 'DESCRIPTION', 'LOCALISATION']

    const positions = order.map((label) => text.indexOf(label))
    expect(positions).toEqual([...positions].sort((left, right) => left - right))
    expect(positions.every((position) => position >= 0)).toBe(true)
  })
})

/**
 * The panel opens on the list's copy — instant, no wait on click — and the
 * detail endpoint corrects it. It used to throw that fresh report away and
 * keep only the history, so a report an external service had just taken
 * charge of showed the move in its journal while the pill still read
 * "Transmis" and the trail marked "Pris en charge" grey *with its date below*.
 */
describe('staleness', () => {
  it('trusts the detail endpoint over the row it was opened from', async () => {
    apiFetch.mockResolvedValue({
      report: report({ status: 'pris_en_charge' }),
      history: [],
      contact: { channel: 'email', reachable: true },
    })

    const wrapper = sidebar({ report: report({ status: 'transmis' }) })
    await flushPromises()

    expect(wrapper.text()).toContain('Pris en charge')
    expect(wrapper.text()).not.toContain('Transmis')
  })

  it('hands the fresher report back so the table stops disagreeing', async () => {
    const fresh = report({ status: 'pris_en_charge' })
    apiFetch.mockResolvedValue({ report: fresh, history: [], contact: null })

    const wrapper = sidebar({ report: report({ status: 'transmis' }) })
    await flushPromises()

    expect(wrapper.emitted('refreshed')?.[0]).toEqual([fresh])
  })

  /**
   * The id does not change when an agent acts or realtime lands, so the load
   * above never re-fires — and the journal stayed frozen on the state the
   * panel opened with.
   */
  it('reloads the journal when the status moves under it', async () => {
    const wrapper = sidebar()
    await flushPromises()
    apiFetch.mockClear()

    await wrapper.setProps({ report: report({ status: 'pris_en_charge' }) })
    await flushPromises()

    expect(apiFetch).toHaveBeenCalledWith(expect.stringContaining('/api/reports/'))
  })

  /**
   * Coming back to the tab is the moment the screen is most likely stale — an
   * external service clicked its link while nobody was looking. One request,
   * at the instant somebody looks again; a timer would repeat the same work
   * through every hour nobody is reading.
   */
  it('refreshes when the tab comes back to the foreground', async () => {
    const wrapper = sidebar()
    await flushPromises()
    apiFetch.mockClear()

    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()

    expect(apiFetch).toHaveBeenCalled()
  })

  /** A closed panel has nothing to keep fresh. */
  it('stays quiet when it is not open', async () => {
    const wrapper = sidebar({ open: false })
    await flushPromises()
    apiFetch.mockClear()

    document.dispatchEvent(new Event('visibilitychange'))
    await flushPromises()

    expect(apiFetch).not.toHaveBeenCalled()
  })

  /**
   * A late answer must not overwrite the report one has since moved to.
   *
   * Two clicks on the step arrows fire two loads; the first can land second,
   * and would then show the previous report's history under the current one's
   * title.
   */
  it('drops a response that arrives after the panel moved on', async () => {
    let releaseFirst: (value: unknown) => void = () => {}
    apiFetch.mockImplementationOnce(() => new Promise((resolve) => { releaseFirst = resolve }))

    const wrapper = sidebar({ report: report({ id: 'first-report' }) })

    apiFetch.mockResolvedValue({
      report: report({ id: 'second-report', status: 'pris_en_charge' }),
      history: [],
      contact: null,
    })
    await wrapper.setProps({ report: report({ id: 'second-report' }) })
    await flushPromises()

    // The first request only now comes back, for a report nobody is looking at.
    releaseFirst({ report: report({ id: 'first-report', status: 'resolu' }), history: [], contact: null })
    await flushPromises()

    const refreshed = wrapper.emitted('refreshed') ?? []
    expect(refreshed.every((call) => (call[0] as any).id === 'second-report')).toBe(true)
  })
})

/**
 * Migration 034 renamed the status of some reports without touching their
 * history, so the trail announced "à venir" under the blue, current step.
 * Migration 036 repairs the data; this is the guard that stops a trail from
 * contradicting itself whenever a row is missing, whatever the reason.
 */
describe('the trail with incomplete history', () => {
  it('never calls a reached step "à venir"', async () => {
    apiFetch.mockResolvedValue({
      report: report({ status: 'transmis' }),
      // Exactly what migration 034 left behind: the transmission recorded
      // under the wrong name, so no row matches `transmis`.
      history: [
        { id: 'h1', report_id: 'r', old_status: 'en_attente', new_status: 'en_attente', agent_id: null, changed_at: '2026-06-16T15:43:02Z', comment: null },
        { id: 'h2', report_id: 'r', old_status: 'en_attente', new_status: 'pris_en_charge', agent_id: null, changed_at: '2026-06-16T15:43:03Z', comment: 'Transmis automatiquement au service concerné' },
      ],
      contact: null,
    })

    const wrapper = sidebar({ report: report({ status: 'transmis' }) })
    await flushPromises()

    // The step it is on carries a dash, not a promise about the future.
    const trail = wrapper.find('section').text()
    expect(trail).toContain('Transmis')
    expect(trail).toContain('—')
  })

  it('still says "à venir" about a step genuinely ahead', async () => {
    apiFetch.mockResolvedValue({
      report: report({ status: 'en_attente' }),
      history: [],
      contact: null,
    })

    const wrapper = sidebar()
    await flushPromises()

    expect(wrapper.find('section').text()).toContain('à venir')
  })
})

/**
 * An observer sees the whole back-office and writes nothing to it.
 *
 * The buttons disappear rather than being disabled: a greyed-out button
 * invites you to look for how to enable it, when there is nothing to do — the
 * role decides. The server refuses anyway; this spares them learning it from
 * a 403.
 */
describe('an observer', () => {
  function observerPanel(props: Record<string, unknown> = {}) {
    useAuthStore().role = 'observer'
    return sidebar(props)
  }

  it('reads the report card in full', async () => {
    const wrapper = observerPanel()
    await flushPromises()

    expect(wrapper.text()).toContain('Lampadaire éteint')
    expect(wrapper.text()).toContain('DESCRIPTION DE L’HABITANT')
  })

  it('is offered no way to move the status', async () => {
    const wrapper = observerPanel()
    await flushPromises()

    expect(wrapper.text()).not.toContain('Prendre en charge')
    expect(wrapper.text()).not.toContain('Marquer résolu')
    expect(wrapper.text()).not.toContain('Transmettre')
  })

  it('cannot write to the resident', async () => {
    const wrapper = observerPanel({ initialView: 'messages' })
    await flushPromises()

    expect(wrapper.text()).toContain('ÉCHANGES AVEC L’HABITANT')
    expect(wrapper.text()).not.toContain('Joindre une photo')
    expect(wrapper.find('textarea').exists()).toBe(false)
  })

  it('still reaches every view of the rail', async () => {
    const wrapper = observerPanel()
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text() === 'Journal')!.trigger('click')
    expect(wrapper.text()).toContain('Aucun changement de statut pour l’instant')
  })
})
