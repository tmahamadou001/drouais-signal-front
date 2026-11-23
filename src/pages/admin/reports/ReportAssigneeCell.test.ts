import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ReportAssigneeCell from './ReportAssigneeCell.vue'

const make = (report: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  mount(ReportAssigneeCell, { props: { report: { id: 'r1', status: 'en_attente', ...report } as never, assigneeName: null, serviceName: null, serviceColor: null, closed: false, ...extra }, global: { stubs: { AppIcon: true } } })

describe('ReportAssigneeCell — transmis hors de la mairie', () => {
  const external = { serviceName: 'Régie d’éclairage', recipient: 'regie@exemple.fr', sentAt: '2026-11-13T10:00:00Z', state: 'sent', count: 1 }

  it('still says nobody has it inside, and adds where it went', () => {
    const wrapper = make({ assignee_id: null, external })
    expect(wrapper.find('[data-testid="to-assign-cell"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="external-line"]').text()).toContain('Régie d’éclairage')
    expect(wrapper.get('[data-testid="external-line"]').text()).toContain('envoyé')
    // Le libellé complet reste lisible au survol.
    expect(wrapper.get('[data-testid="external-line"]').attributes('title')).toContain('Transmis, pas encore vu')
  })

  it('shows it under an assignee too', () => {
    const wrapper = make({ assignee_id: 'u1', external: { ...external, state: 'done' } }, { assigneeName: 'Marc Leroy' })
    expect(wrapper.text()).toContain('Marc Leroy')
    expect(wrapper.get('[data-testid="external-line"]').text()).toContain('terminé')
  })

  it('adds no line to a report that never left', () => {
    expect(make({ assignee_id: null, external: null }).find('[data-testid="external-line"]').exists()).toBe(false)
    expect(make({ assignee_id: null }).find('[data-testid="external-line"]').exists()).toBe(false)
  })
})
