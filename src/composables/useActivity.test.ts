import { describe, it, expect, vi, beforeEach } from 'vitest'

const { apiFetch, toast, channelApi } = vi.hoisted(() => {
  const handlers: { insert?: () => void; subscribe?: (status: string) => void } = {}
  const channel: any = {
    on: vi.fn((_type: string, _filter: unknown, handler: () => void) => { handlers.insert = handler; return channel }),
    subscribe: vi.fn((callback: (status: string) => void) => { handlers.subscribe = callback; return channel }),
  }
  return {
    apiFetch: vi.fn(),
    toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
    channelApi: { channel, handlers, create: vi.fn(() => channel), remove: vi.fn().mockResolvedValue('ok') },
  }
})

vi.mock('@/composables/useApi', () => ({ useApi: () => ({ apiFetch }) }))
vi.mock('@/composables/useToast', () => ({ useToast: () => toast }))
vi.mock('@/lib/supabase', () => ({ supabase: { channel: channelApi.create, removeChannel: channelApi.remove } }))

import { useActivity } from './useActivity'
import type { ActivityItem } from '@/types/team'

const item = (id: string, overrides: Partial<ActivityItem> = {}): ActivityItem => ({
  id, kind: 'mention', reportId: 'r1', reportTitle: 'Nid-de-poule', reportReference: 'LAL-1',
  actorName: 'Marc Leroy', excerpt: 'Julie ?', readAt: null, createdAt: '2026-11-22T10:00:00Z', ...overrides,
})

beforeEach(async () => {
  // Fermer d'abord ce que le test précédent a laissé ouvert, **puis** remettre les compteurs à zéro.
  await useActivity().stop()
  vi.clearAllMocks()
  apiFetch.mockResolvedValue({ items: [item('a'), item('b'), item('c', { reportId: 'r2' })], unread: 3 })
})

describe('useActivity', () => {
  it('loads the list and the unread count when it starts, and listens to this user only', async () => {
    const activity = useActivity()

    await activity.start('julie')

    expect(apiFetch).toHaveBeenCalledWith('/api/activity?limit=30')
    expect(activity.unread.value).toBe(3)
    expect(channelApi.channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({ table: 'activity_notifications', filter: 'user_id=eq.julie' }),
      expect.any(Function)
    )
  })

  it('opens one connection however many times it is started for the same user', async () => {
    const activity = useActivity()
    await activity.start('julie')
    await activity.start('julie')
    await activity.start('julie')

    expect(channelApi.create).toHaveBeenCalledTimes(1)
  })

  it('reopens for another user, closing the first', async () => {
    const activity = useActivity()
    await activity.start('julie')
    await activity.start('marc')

    expect(channelApi.remove).toHaveBeenCalledTimes(1)
    expect(channelApi.create).toHaveBeenCalledTimes(2)
  })

  it('reloads and announces when a row arrives in real time', async () => {
    const activity = useActivity()
    await activity.start('julie')
    apiFetch.mockResolvedValue({ items: [item('new', { actorName: 'Paul' })], unread: 1 })

    channelApi.handlers.insert!()
    await vi.waitFor(() => expect(toast.info).toHaveBeenCalled())

    expect(toast.info).toHaveBeenCalledWith('Paul vous a mentionné', 'Nid-de-poule')
    expect(activity.unread.value).toBe(1)
  })

  it('does not announce a row that is already read', async () => {
    const activity = useActivity()
    await activity.start('julie')
    apiFetch.mockResolvedValue({ items: [item('old', { readAt: '2026-11-22T10:01:00Z' })], unread: 0 })

    channelApi.handlers.insert!()
    await vi.waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2))

    expect(toast.info).not.toHaveBeenCalled()
  })

  it('tells whether the live connection is up', async () => {
    const activity = useActivity()
    await activity.start('julie')

    channelApi.handlers.subscribe!('SUBSCRIBED')
    expect(activity.connected.value).toBe(true)
    channelApi.handlers.subscribe!('CLOSED')
    expect(activity.connected.value).toBe(false)
  })
})

describe('marking read', () => {
  it('lowers the counter at once, then tells the server', async () => {
    const activity = useActivity()
    await activity.start('julie')
    apiFetch.mockResolvedValue(undefined)

    await activity.markRead('a')

    expect(activity.unread.value).toBe(2)
    expect(activity.items.value.find((entry) => entry.id === 'a')?.readAt).toBeTruthy()
    expect(apiFetch).toHaveBeenLastCalledWith('/api/activity/read', { method: 'POST', body: { ids: ['a'] } })
  })

  it('does not count a row twice', async () => {
    const activity = useActivity()
    await activity.start('julie')
    apiFetch.mockResolvedValue(undefined)

    await activity.markRead('a')
    await activity.markRead('a')

    expect(activity.unread.value).toBe(2)
  })

  it('marks everything read', async () => {
    const activity = useActivity()
    await activity.start('julie')
    apiFetch.mockResolvedValue(undefined)

    await activity.markAllRead()

    expect(activity.unread.value).toBe(0)
    expect(activity.items.value.every((entry) => entry.readAt)).toBe(true)
    expect(apiFetch).toHaveBeenLastCalledWith('/api/activity/read', { method: 'POST', body: { all: true } })
  })

  it('reads a report\'s rows when it is opened by another path — and skips the call when there are none', async () => {
    const activity = useActivity()
    await activity.start('julie')
    apiFetch.mockResolvedValue(undefined)
    apiFetch.mockClear()

    await activity.markReportRead('r1')
    expect(activity.unread.value).toBe(1)
    expect(apiFetch).toHaveBeenCalledWith('/api/activity/reports/r1/read', { method: 'POST' })

    apiFetch.mockClear()
    await activity.markReportRead('r-unknown')
    expect(apiFetch).not.toHaveBeenCalled()
  })

  it('restores the truth from the server when the call fails', async () => {
    const activity = useActivity()
    await activity.start('julie')
    apiFetch.mockRejectedValueOnce(new Error('réseau'))
    apiFetch.mockResolvedValue({ items: [item('a')], unread: 1 })

    await activity.markRead('a')
    await vi.waitFor(() => expect(activity.unread.value).toBe(1))
  })
})

describe('stop', () => {
  it('closes the connection and forgets everything', async () => {
    const activity = useActivity()
    await activity.start('julie')

    await activity.stop()

    expect(channelApi.remove).toHaveBeenCalled()
    expect(activity.items.value).toEqual([])
    expect(activity.unread.value).toBe(0)
  })
})
