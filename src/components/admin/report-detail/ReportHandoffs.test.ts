import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ReportHandoffs from './ReportHandoffs.vue'

const handoff = (extra = {}) => ({ id: 'h1', serviceName: 'Régie d’éclairage', recipient: 'regie@exemple.fr', sentAt: '2026-11-13T10:00:00Z', expiresAt: '2999-01-01T00:00:00Z', acknowledgedAt: null, completedAt: null, state: 'sent', ...extra })
const make = (handoffs?: unknown[]) => mount(ReportHandoffs, { props: { team: { assignee: null, service: null, assignedAt: null, events: [], handoffs } as never }, global: { stubs: { AppIcon: true } } })

describe('ReportHandoffs', () => {
  it('says nothing when the report never left the town hall', () => {
    expect(make([]).find('[data-testid="report-handoffs"]').exists()).toBe(false)
    expect(make(undefined).find('[data-testid="report-handoffs"]').exists()).toBe(false)
  })

  it('names the intervener, the address it went to, and where it stands', () => {
    const wrapper = make([handoff()])
    expect(wrapper.text()).toContain('Régie d’éclairage')
    expect(wrapper.text()).toContain('regie@exemple.fr')
    expect(wrapper.get('[data-testid="handoff-state"]').text()).toContain('pas encore vu')
  })

  it('lists every transmission, the latest first, each with its own state', () => {
    const wrapper = make([handoff({ id: 'h2', state: 'acknowledged' }), handoff({ id: 'h1', serviceName: null, state: 'expired' })])
    const states = wrapper.findAll('[data-testid="handoff-state"]').map((node) => node.text())
    expect(states).toEqual(['Pris en compte', 'Lien expiré, sans réponse'])
    expect(wrapper.text()).toContain('Intervenant extérieur')
  })
})
