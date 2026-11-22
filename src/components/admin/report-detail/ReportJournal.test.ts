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
    expect(wrapper.text()).not.toContain('Intervenant extérieur')
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
    expect(wrapper.text()).not.toContain('Intervenant extérieur')
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

describe('ReportJournal — organisation events', () => {
  const event = (overrides: Record<string, unknown> = {}) => ({
    id: 'e1', kind: 'assigned' as const, createdAt: '2026-09-17T11:00:00.000Z',
    actorName: 'Julie Martin', assigneeName: 'Marc Leroy', serviceName: null, ...overrides,
  })

  it('says who confided the report to whom', () => {
    const wrapper = mount(ReportJournal, { props: { history: [], events: [event()] } })
    expect(wrapper.text()).toContain('Julie Martin a confié le signalement à Marc Leroy')
  })

  it('says it was routed automatically, and to whom', () => {
    const wrapper = mount(ReportJournal, {
      props: { history: [], events: [event({ kind: 'auto_routed', actorName: null })] },
    })
    expect(wrapper.text()).toContain('Aiguillé automatiquement vers Marc Leroy')
  })

  it('falls back to the service when the rule only named one', () => {
    const wrapper = mount(ReportJournal, {
      props: { history: [], events: [event({ kind: 'auto_routed', actorName: null, assigneeName: null, serviceName: 'Voirie' })] },
    })
    expect(wrapper.text()).toContain('Aiguillé automatiquement vers le service Voirie')
  })

  it('names the unassignment and the service change', () => {
    const wrapper = mount(ReportJournal, {
      props: { history: [], events: [event({ id: 'e2', kind: 'unassigned' }), event({ id: 'e3', kind: 'service_changed', serviceName: 'Propreté' })] },
    })
    expect(wrapper.text()).toContain('Julie Martin a retiré l’assignation')
    expect(wrapper.text()).toContain('l’a rattaché au service Propreté')
  })

  it('weaves status changes and organisation events into one thread, most recent first', () => {
    const wrapper = mount(ReportJournal, {
      props: {
        history: [entry({ changed_at: '2026-09-17T10:00:00.000Z', comment: 'prise en charge' })],
        events: [event({ createdAt: '2026-09-17T12:00:00.000Z' })],
      },
    })

    const text = wrapper.text()
    expect(text.indexOf('a confié le signalement')).toBeLessThan(text.indexOf('prise en charge'))
    expect(wrapper.findAll('[data-testid="journal-team-event"]')).toHaveLength(1)
  })

  it('shows an event-only journal, with no status change at all', () => {
    const wrapper = mount(ReportJournal, { props: { history: [], events: [event()] } })
    expect(wrapper.find('[data-testid="journal"]').exists()).toBe(true)
  })

  it('names a colleague who left rather than an identifier', () => {
    const wrapper = mount(ReportJournal, { props: { history: [], events: [event({ actorName: null, assigneeName: null })] } })
    expect(wrapper.text()).toContain('Un collègue a confié le signalement à un collègue')
  })
})

describe('ReportJournal — cycle de vie', () => {
  const event = (overrides: Record<string, unknown>) => ({
    id: 'e1', kind: 'reopened', createdAt: '2026-09-17T11:00:00.000Z', actorName: 'Julie Martin',
    assigneeName: null, serviceName: null, plannedFor: null, note: null, ...overrides,
  })

  it('says a report was reopened, and why', () => {
    const wrapper = mount(ReportJournal, { props: { history: [], events: [event({ note: 'Le trou est revenu' })] as never } })
    expect(wrapper.text()).toContain('Julie Martin a rouvert le signalement — Le trou est revenu')
  })

  it('dates a planned intervention in French', () => {
    const wrapper = mount(ReportJournal, { props: { history: [], events: [event({ kind: 'planned', plannedFor: '2026-12-02', note: 'Matinée' })] as never } })
    expect(wrapper.text()).toContain('a prévu l’intervention le 2 décembre 2026 — Matinée')
  })

  it('says the date was removed', () => {
    const wrapper = mount(ReportJournal, { props: { history: [], events: [event({ kind: 'unplanned' })] as never } })
    expect(wrapper.text()).toContain('a retiré la date d’intervention')
  })
})

describe('ReportJournal — fusion et catégorie', () => {
  const event = (overrides: Record<string, unknown>) => ({
    id: 'e1', kind: 'merged', createdAt: '2026-09-17T11:00:00.000Z', actorName: 'Julie Martin',
    assigneeName: null, serviceName: null, plannedFor: null, note: null, detail: null, ...overrides,
  })

  it('names the duplicate merged into this report', () => {
    const wrapper = mount(ReportJournal, { props: { history: [], events: [event({ detail: 'DRE-2026-00004' })] as never } })
    expect(wrapper.text()).toContain('Julie Martin a fusionné le doublon DRE-2026-00004')
  })

  it('names the main report this one was merged into', () => {
    const wrapper = mount(ReportJournal, { props: { history: [], events: [event({ kind: 'merged_into', detail: 'DRE-2026-00009' })] as never } })
    expect(wrapper.text()).toContain('a fusionné ce signalement dans DRE-2026-00009')
  })

  it('says what the category was corrected from and to', () => {
    const wrapper = mount(ReportJournal, { props: { history: [], events: [event({ kind: 'category_changed', detail: 'voirie → eclairage' })] as never } })
    expect(wrapper.text()).toContain('a corrigé la catégorie (voirie → eclairage)')
  })
})

describe('ReportJournal — l\'auteur et les habitants', () => {
  const byAuthor = (comment: string) => mount(ReportJournal, { props: { history: [entry({ agent_id: null, agent_name: null, new_status: 'resolu', comment })] } })

  it('names the author when they close their own report, not an outside service', () => {
    const wrapper = byAuthor('Auteur — signalement clos par son auteur')
    expect(wrapper.text()).toContain('Auteur du signalement')
    expect(wrapper.text()).toContain('signalement clos par son auteur')
    expect(wrapper.text()).not.toContain('Intervenant extérieur')
    expect(wrapper.text()).not.toContain('Auteur — ')
  })

  it('names the residents for the older closings they made together', () => {
    const wrapper = byAuthor('Habitants — constaté réparé sur place')
    expect(wrapper.text()).toContain('Habitants')
    expect(wrapper.text()).toContain('constaté réparé sur place')
    expect(wrapper.text()).not.toContain('Intervenant extérieur')
  })
})
