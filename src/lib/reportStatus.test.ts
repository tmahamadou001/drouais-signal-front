import { describe, it, expect } from 'vitest'
import { nextStatus, rollbackTargets, isFinal, statusPill } from './reportStatus'

describe('nextStatus', () => {
  /**
   * `transmis` advances like `en_attente`: the email is out, nobody has replied
   * yet, so an agent can still take it on themselves.
   */
  it('advances a transmitted report to taken charge', () => {
    expect(nextStatus('transmis')).toBe('pris_en_charge')
    expect(nextStatus('en_attente')).toBe('pris_en_charge')
  })

  it('advances a report in progress to resolved', () => {
    expect(nextStatus('pris_en_charge')).toBe('resolu')
  })

  it('offers nothing beyond resolved', () => {
    expect(nextStatus('resolu')).toBeNull()
  })
})

describe('rollbackTargets', () => {
  it('offers every earlier step', () => {
    expect(rollbackTargets('pris_en_charge')).toEqual(['en_attente', 'transmis'])
  })

  it('offers nothing from the first step', () => {
    expect(rollbackTargets('en_attente')).toEqual([])
  })

  /**
   * Resolving tells the citizen it is done. Reopening would make that promise
   * something the commune can withdraw, and would let one report be counted
   * resolved twice.
   */
  it('offers nothing from resolved', () => {
    expect(rollbackTargets('resolu')).toEqual([])
    expect(isFinal('resolu')).toBe(true)
  })
})

describe('statusPill', () => {
  it('labels every known status', () => {
    expect(statusPill('transmis').label).toBe('Transmis')
  })

  /** An unknown status must not render a raw slug with no styling at all. */
  it('falls back to the raw value rather than throwing', () => {
    expect(statusPill('inconnu').label).toBe('inconnu')
    expect(statusPill('inconnu').icon).toBe('Circle')
  })
})
