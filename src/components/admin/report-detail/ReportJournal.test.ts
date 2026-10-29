import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ReportJournal from './ReportJournal.vue'
import type { StatusHistoryEntry } from '@/types'

function entry(overrides: Partial<StatusHistoryEntry> = {}): StatusHistoryEntry {
  return {
    id: 'h1',
    report_id: 'r1',
    old_status: 'en_attente',
    new_status: 'pris_en_charge',
    agent_id: 'u1',
    agent_name: 'Claire Meunier',
    changed_at: '2026-09-17T10:00:00.000Z',
    comment: null,
    ...overrides,
  }
}

describe('ReportJournal', () => {
  it('lists a plain status change, which used to vanish', () => {
    // The whole reason this was rewritten: an agent marked a report resolved
    // and the Journal tab stayed empty, right after an action that had just
    // happened and was recorded in `status_history`.
    const wrapper = mount(ReportJournal, { props: { history: [entry()] } })

    expect(wrapper.text()).toContain('Claire Meunier')
    expect(wrapper.text()).toContain('Pris en charge')
  })

  it('names the agent rather than saying “Agent”', () => {
    const wrapper = mount(ReportJournal, { props: { history: [entry()] } })

    expect(wrapper.text()).toContain('Claire Meunier')
    expect(wrapper.text()).not.toContain('Agent →')
  })

  it('falls back to “Agent” when the person has left the commune', () => {
    const wrapper = mount(ReportJournal, {
      props: { history: [entry({ agent_name: null })] },
    })

    expect(wrapper.text()).toContain('Agent')
  })

  it('gives every entry the same card', () => {
    const wrapper = mount(ReportJournal, {
      props: {
        history: [
          entry({ id: 'h1', comment: null }),
          entry({ id: 'h2', comment: 'Ampoule remplacée, passage du 12/09' }),
        ],
      },
    })

    expect(wrapper.findAll('article')).toHaveLength(2)
    expect(wrapper.text()).toContain('Ampoule remplacée, passage du 12/09')
  })

  it('calls the first entry a deposit, not an outside service', () => {
    // `insert_initial_status_history` writes the only row where old and new
    // status match, with no author. It fell into the "outside service"
    // fallback: the journal announced a contractor where there was only the
    // resident who had just reported something.
    const wrapper = mount(ReportJournal, {
      props: {
        history: [
          entry({
            id: 'h0',
            agent_id: null,
            agent_name: null,
            old_status: 'en_attente',
            new_status: 'en_attente',
            comment: null,
          }),
        ],
      },
    })

    expect(wrapper.text()).toContain('Dépôt du signalement')
    expect(wrapper.text()).not.toContain('Service extérieur')
  })

  it('names the service rather than repeating it under a generic label', () => {
    // The server writes "Éclairage : …". Labelling that card "Service
    // extérieur" says the same thing twice, and less well.
    const wrapper = mount(ReportJournal, {
      props: {
        history: [
          entry({
            agent_id: null,
            agent_name: null,
            new_status: 'resolu',
            comment: 'Éclairage : ampoule remplacée',
          }),
        ],
      },
    })

    expect(wrapper.text()).toContain('Éclairage')
    expect(wrapper.text()).toContain('ampoule remplacée')
    expect(wrapper.text()).not.toContain('Éclairage : ampoule remplacée')
    expect(wrapper.text()).not.toContain('Service extérieur')
  })

  it('drops a body that only repeats the label', () => {
    // "Via le lien de transmission (Éclairage)" carries nothing the header
    // does not already say.
    const wrapper = mount(ReportJournal, {
      props: {
        history: [
          entry({
            agent_id: null,
            agent_name: null,
            comment: 'Via le lien de transmission (Éclairage)',
          }),
        ],
      },
    })

    expect(wrapper.text()).toContain('Éclairage')
    expect(wrapper.find('p').exists()).toBe(false)
  })

  it('shows the most recent first', () => {
    const wrapper = mount(ReportJournal, {
      props: {
        history: [
          entry({ id: 'h1', comment: 'première' }),
          entry({ id: 'h2', comment: 'dernière' }),
        ],
      },
    })

    const text = wrapper.text()
    expect(text.indexOf('dernière')).toBeLessThan(text.indexOf('première'))
  })

  it('renders nothing at all when there is no history', () => {
    const wrapper = mount(ReportJournal, { props: { history: [] } })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
