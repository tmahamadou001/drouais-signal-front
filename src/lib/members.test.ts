import { describe, expect, it } from 'vitest'
import { memberLabel, memberSearchText } from './members'

describe('memberLabel', () => {
  it('prefers the name', () => expect(memberLabel({ name: 'Julie Martin', email: 'j@x.fr' })).toBe('Julie Martin'))
  it('falls back on the e-mail address when there is no name', () => expect(memberLabel({ name: null, email: 'sans-nom@exemple.fr' })).toBe('sans-nom@exemple.fr'))
  it('treats a blank name like a missing one', () => expect(memberLabel({ name: '  ', email: 'a@x.fr' })).toBe('a@x.fr'))
  it('says it does not know only when there is nothing at all', () => {
    expect(memberLabel({ name: null, email: null })).toBe('Sans nom')
    expect(memberLabel({ name: null }, 'Membre sans nom')).toBe('Membre sans nom')
    expect(memberLabel(null)).toBe('Sans nom')
  })
})

describe('memberSearchText', () => {
  it('lets a search find a member by name or by address, accents and case aside', () => {
    expect(memberSearchText({ name: 'Zoé Bernard', email: null })).toContain('zoe bernard')
    expect(memberSearchText({ name: null, email: 'Sans.Nom@Exemple.fr' })).toContain('sans.nom@exemple.fr')
  })
})
