import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReportStatusTrail from './ReportStatusTrail.vue'

const stubs = { AppIcon: true }
const report = (over: Record<string, unknown> = {}) => ({ id: 'r1', status: 'pris_en_charge', created_at: '2026-11-01T10:00:00Z', ...over })
const mountTrail = (r: Record<string, unknown>, history: unknown[] = []) =>
  mount(ReportStatusTrail, { props: { report: r as never, history: history as never, overdue: false }, global: { stubs } })

describe('ReportStatusTrail — cycle de vie', () => {
  it('draws no steps for a report closed without repair, but says the state, the date and the reason', () => {
    const wrapper = mountTrail(report({ status: 'annule' }), [
      { id: 'h1', new_status: 'annule', changed_at: '2026-11-10T10:00:00Z', comment: 'Hors compétence' },
    ])

    const banner = wrapper.find('[data-testid="closed-without-repair"]')
    expect(banner.text()).toContain('Annulé')
    expect(banner.text()).toContain('10/11')
    expect(banner.text()).toContain('Hors compétence')
    expect(wrapper.text()).not.toContain('Pris en charge')
  })

  it('still shows the state when the history has no entry for it', () => {
    const wrapper = mountTrail(report({ status: 'indesirable' }))
    expect(wrapper.find('[data-testid="closed-without-repair"]').text()).toContain('Indésirable')
  })

  it('draws the steps of an ordinary report', () => {
    const wrapper = mountTrail(report())
    expect(wrapper.find('[data-testid="closed-without-repair"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Pris en charge')
  })

  it('announces the planned intervention, in French', () => {
    const wrapper = mountTrail(report({ planned_for: '2026-12-02' }))
    expect(wrapper.find('[data-testid="planned-line"]').text()).toContain('2 décembre 2026')
  })

  it('does not announce a date on a resolved or cancelled report', () => {
    expect(mountTrail(report({ status: 'resolu', planned_for: '2026-12-02' })).find('[data-testid="planned-line"]').exists()).toBe(false)
    expect(mountTrail(report({ status: 'annule', planned_for: '2026-12-02' })).find('[data-testid="planned-line"]').exists()).toBe(false)
  })
})
