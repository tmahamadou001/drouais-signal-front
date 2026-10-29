import { describe, it, expect, vi, beforeEach } from 'vitest'

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }))
vi.mock('@/composables/useApi', () => ({ useApi: () => ({ apiFetch }) }))

import { useUnreadComments } from './useUnreadComments'

function payload(overrides: Record<string, unknown> = {}) {
  return {
    total: 3,
    byReport: { r1: 2, r2: 1 },
    items: [
      { report_id: 'r1', report_title: 'Lampadaire', report_reference: 'LAL-2026-00418', last_reply_at: '2026-09-15T10:00:00.000Z', count: 2 },
      { report_id: 'r2', report_title: 'Nid-de-poule', report_reference: 'LAL-2026-00419', last_reply_at: '2026-09-15T09:00:00.000Z', count: 1 },
    ],
    ...overrides,
  }
}

beforeEach(async () => {
  vi.clearAllMocks()
  apiFetch.mockResolvedValue(payload({ total: 0, byReport: {}, items: [] }))
  await useUnreadComments().loadUnread()
})

describe('loadUnread', () => {
  it('keeps the count and what to show for it', async () => {
    apiFetch.mockResolvedValue(payload())

    const unread = useUnreadComments()
    await unread.loadUnread()

    expect(unread.totalUnread.value).toBe(3)
    expect(unread.unreadByReport.value).toEqual({ r1: 2, r2: 1 })
    expect(unread.items.value).toHaveLength(2)
  })

  /**
   * A missing counter is better than a screen in error: the page still works
   * without it.
   */
  it('stays quiet when the request fails', async () => {
    apiFetch.mockRejectedValue(new Error('offline'))

    const unread = useUnreadComments()
    await unread.loadUnread()

    expect(unread.totalUnread.value).toBe(0)
  })
})

describe('state sharing', () => {
  /**
   * The bell and the table badges count the same thing. Two counters computed
   * separately end up contradicting each other on screen.
   */
  it('is shared between callers', async () => {
    apiFetch.mockResolvedValue(payload())
    await useUnreadComments().loadUnread()

    expect(useUnreadComments().totalUnread.value).toBe(3)
  })
})

describe('noteReply', () => {
  it('moves the counter at once, without waiting for the server', () => {
    const unread = useUnreadComments()
    unread.noteReply('r9')

    expect(unread.totalUnread.value).toBe(1)
    expect(unread.unreadByReport.value.r9).toBe(1)
  })

  it('asks the server for the rest, since the title comes from it', () => {
    useUnreadComments().noteReply('r9')

    expect(apiFetch).toHaveBeenCalledWith('/api/comments/unread')
  })
})

describe('markRead', () => {
  it('clears the report the agent just opened', async () => {
    apiFetch.mockResolvedValue(payload())
    const unread = useUnreadComments()
    await unread.loadUnread()

    unread.markRead('r1')

    expect(unread.totalUnread.value).toBe(1)
    expect(unread.unreadByReport.value.r1).toBeUndefined()
    expect(unread.items.value.map((item) => item.report_id)).toEqual(['r2'])
  })

  it('does nothing for a report that had nothing unread', async () => {
    apiFetch.mockResolvedValue(payload())
    const unread = useUnreadComments()
    await unread.loadUnread()

    unread.markRead('inconnu')

    expect(unread.totalUnread.value).toBe(3)
  })

  it('never lets the total go below zero', () => {
    const unread = useUnreadComments()
    unread.noteReply('r9')
    unread.markRead('r9')
    unread.markRead('r9')

    expect(unread.totalUnread.value).toBe(0)
  })
})
