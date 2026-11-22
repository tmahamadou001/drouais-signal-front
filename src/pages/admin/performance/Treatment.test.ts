import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TreatmentIndicators from './TreatmentIndicators.vue'
import ServiceBreakdown from './ServiceBreakdown.vue'

const stubs = { AppIcon: true }
const indicators = (over = {}) => ({
  total: 20, open_count: 6, overdue_count: 2, unassigned_count: 3, resolved_count: 10, closed_without_repair: 1,
  awaiting_clarification: 2, reopened_count: 1, median_ack_hours: 10, median_resolve_hours: 50, p90_resolve_hours: 200,
  ack_within_48h_rate: 90, ...over,
})
const tile = (w: ReturnType<typeof mount>, key: string) => w.find(`[data-testid="tile-${key}"]`).text()

describe('TreatmentIndicators', () => {
  it('says what is waiting, and how much of it is late', () => {
    const w = mount(TreatmentIndicators, { props: { indicators: indicators() }, global: { stubs } })
    expect(tile(w, 'open')).toContain('6')
    expect(tile(w, 'open')).toContain('dont 2 en retard')
    expect(tile(w, 'unassigned')).toContain('personne ne les a encore')
  })

  it('gives the medians with their reference, not the mean alone', () => {
    const w = mount(TreatmentIndicators, { props: { indicators: indicators() }, global: { stubs } })
    expect(tile(w, 'ack')).toContain('10 h')
    expect(tile(w, 'ack')).toContain('90 % en moins de 48 h')
    expect(tile(w, 'resolve')).toContain('2 j 02 h')
    expect(tile(w, 'resolve')).toContain('9 sur 10 en moins de 8 j 08 h')
  })

  it('reassures when there is nothing to chase', () => {
    const w = mount(TreatmentIndicators, { props: { indicators: indicators({ overdue_count: 0, unassigned_count: 0, reopened_count: 0, awaiting_clarification: 0 }) }, global: { stubs } })
    expect(tile(w, 'open')).toContain('aucun en retard')
    expect(tile(w, 'unassigned')).toContain('tout est confié')
    expect(tile(w, 'reopened')).toContain('aucune réparation contestée')
    expect(tile(w, 'clarification')).toContain('aucune en attente')
  })

  it('says « pas encore mesurée » when nothing was timed — never a zero', () => {
    const w = mount(TreatmentIndicators, { props: { indicators: indicators({ median_ack_hours: null, median_resolve_hours: null, p90_resolve_hours: null, ack_within_48h_rate: null }) }, global: { stubs } })
    expect(tile(w, 'ack')).toContain('—')
    expect(tile(w, 'ack')).toContain('pas encore mesurée')
    expect(tile(w, 'resolve')).toContain('pas encore mesurée')
  })
})

const service = (over = {}) => ({
  service_id: 's1', service_name: 'Voirie', service_color: '#3366cc', report_count: 10, open_count: 4, overdue_count: 2,
  measured_count: 5, avg_resolve_hours: 48, median_resolve_hours: 40, sla_compliance_rate: 85, ...over,
})
const category = (over = {}) => ({
  service_id: 's1', category: 'voirie', category_label: 'Voirie et chaussée', report_count: 6, open_count: 2, overdue_count: 1,
  measured_count: 4, avg_resolve_hours: 30, sla_compliance_rate: 50, ...over,
})
const mountBreakdown = (services: unknown[], categories: unknown[] = []) =>
  mount(ServiceBreakdown, { props: { services: services as never, categories: categories as never }, global: { stubs } })

describe('ServiceBreakdown', () => {
  it('says so when the period is empty', () => {
    expect(mountBreakdown([]).find('[data-testid="breakdown-empty"]').exists()).toBe(true)
  })

  it('shows what each service has, late, and its pace', () => {
    const w = mountBreakdown([service()])
    const row = w.find('[data-testid="service-s1"]').text()
    expect(row).toContain('Voirie')
    expect(row).toContain('10')
    expect(row).toContain('2 j')
    expect(row).toContain('85 %')
  })

  it('does not judge a service on fewer than three timed resolutions — « À suivre », not « Critique »', () => {
    const w = mountBreakdown([service({ measured_count: 2, sla_compliance_rate: 0 })])
    expect(w.find('[data-testid="service-s1"]').text()).toContain('À suivre')
  })

  it('lists the work nobody has been given as a row like the others', () => {
    const w = mountBreakdown([service({ service_id: null, service_name: 'Sans service', service_color: null })])
    expect(w.find('[data-testid="service-none"]').text()).toContain('Sans service')
  })

  it('opens a service on a click to show its categories, and only that service', async () => {
    const w = mountBreakdown(
      [service(), service({ service_id: 's2', service_name: 'Propreté' })],
      [category(), category({ service_id: 's2', category: 'encombrants', category_label: 'Encombrants' })]
    )
    expect(w.findAll('[data-testid="category-row"]')).toHaveLength(0)

    await w.find('[data-testid="service-s1"]').trigger('click')
    const rows = w.findAll('[data-testid="category-row"]')
    expect(rows).toHaveLength(1)
    expect(rows[0].text()).toContain('Voirie et chaussée')
    expect(w.find('[data-testid="service-s1"]').attributes('aria-expanded')).toBe('true')

    await w.find('[data-testid="service-s1"]').trigger('click')
    expect(w.findAll('[data-testid="category-row"]')).toHaveLength(0)
  })

  it('colours the overdue count only when there is one', () => {
    const w = mountBreakdown([service({ overdue_count: 0 })])
    expect(w.find('[data-testid="service-s1"] .text-status-danger').exists()).toBe(false)
  })
})
