import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReportTitleCell from './ReportTitleCell.vue'

const cell = (report: Record<string, unknown>) =>
  mount(ReportTitleCell, { props: { report: { id: 'r1', title: 'Nid de poule', ...report } as never, categoryLabel: 'Voirie', overdue: false, unread: 0 }, global: { stubs: { AppIcon: true, CategoryGlyph: true } } })

describe('ReportTitleCell — l\'échange avec l\'habitant', () => {
  it('says « Réponse reçue » when the resident answered and nobody looked yet', () => {
    expect(cell({ reply_received_at: '2026-11-22T10:00:00Z' }).find('[data-testid="reply-received"]').exists()).toBe(true)
  })

  it('says « Précision demandée » while the question waits', () => {
    const wrapper = cell({ clarification_requested_at: '2026-11-22T10:00:00Z' })
    expect(wrapper.find('[data-testid="awaiting-clarification"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="reply-received"]').exists()).toBe(false)
  })

  it('puts the answer first when both are set — what waits for the agent matters more', () => {
    const wrapper = cell({ reply_received_at: 'x', clarification_requested_at: 'y' })
    expect(wrapper.find('[data-testid="reply-received"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="awaiting-clarification"]').exists()).toBe(false)
  })

  it('shows neither on an ordinary report', () => {
    const wrapper = cell({})
    expect(wrapper.find('[data-testid="reply-received"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="awaiting-clarification"]').exists()).toBe(false)
  })
})
