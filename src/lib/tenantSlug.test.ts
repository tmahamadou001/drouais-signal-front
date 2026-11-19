import { describe, it, expect } from 'vitest'
import { slugProblem, suggestSlug } from './tenantSlug'

describe('slugProblem', () => {
  it('accepts a plain commune slug', () => {
    expect(slugProblem('villemeux-sur-eure')).toBeNull()
    expect(slugProblem(' La-Loupe ')).toBeNull()
  })

  it('says what is wrong', () => {
    expect(slugProblem('ab')).toBe('length')
    expect(slugProblem('Ville de Dreux')).toBe('format')
    expect(slugProblem('-dreux')).toBe('format')
    expect(slugProblem('api')).toBe('reserved')
  })
})

describe('suggestSlug', () => {
  it('drops the INSEE code the automatic creation appends', () => {
    expect(suggestSlug('villemeux-sur-eure-28415')).toBe('villemeux-sur-eure')
    expect(suggestSlug('saint-georges-motel-27543')).toBe('saint-georges-motel')
  })

  it('leaves a hand-chosen slug alone', () => {
    expect(suggestSlug('la-loupe')).toBe('la-loupe')
    expect(suggestSlug('cergy95')).toBe('cergy95')
  })
})
