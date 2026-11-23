import { describe, expect, it } from 'vitest'
import { handoffName, handoffShortLabel, handoffStateLabel, handoffTone } from './handoff'

describe('handoff wording', () => {
  it('names the intervener as configured, and says what it is otherwise', () => {
    expect(handoffName({ serviceName: 'Régie d’éclairage' })).toBe('Régie d’éclairage')
    expect(handoffName({ serviceName: '  ' })).toBe('Intervenant extérieur')
    expect(handoffName({ serviceName: null })).toBe('Intervenant extérieur')
  })

  it('says where each transmission stands', () => {
    expect(handoffStateLabel('sent')).toContain('pas encore vu')
    expect(handoffStateLabel('acknowledged')).toBe('Pris en compte')
    expect(handoffStateLabel('done')).toContain('Terminé')
    expect(handoffStateLabel('expired')).toContain('expiré')
  })

  it('has a short form for a narrow cell, one word per state', () => {
    expect(['sent', 'acknowledged', 'done', 'expired'].map((s) => handoffShortLabel(s as never))).toEqual(['envoyé', 'vu', 'terminé', 'expiré'])
  })

  it('colours the one that needs someone to act', () => {
    expect(handoffTone('expired')).toBe('text-status-danger')
    expect(handoffTone('done')).toBe('text-status-done-fg')
    expect(new Set(['sent', 'acknowledged', 'done', 'expired'].map((s) => handoffTone(s as never))).size).toBe(4)
  })
})
