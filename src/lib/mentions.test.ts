import { describe, it, expect } from 'vitest'
import { applyMention, detectMentionQuery, filterMentionable, mentionedIn, segmentsOf } from './mentions'

const people = [
  { id: 'a', name: 'Julie Martin' },
  { id: 'b', name: 'Marc Leroy' },
  { id: 'c', name: 'Élodie Durand' },
]

describe('detectMentionQuery', () => {
  it('opens on an @ at the start or after a space', () => {
    expect(detectMentionQuery('@ju', 3)).toEqual({ start: 0, query: 'ju' })
    expect(detectMentionQuery('Salut @ju', 9)).toEqual({ start: 6, query: 'ju' })
    expect(detectMentionQuery('Salut @', 7)).toEqual({ start: 6, query: '' })
  })

  it('does not open on an e-mail address', () => {
    expect(detectMentionQuery('écris à jean@mairie', 19)).toBeNull()
  })

  it('stays closed when there is no @, or the caret is before it', () => {
    expect(detectMentionQuery('bonjour', 7)).toBeNull()
    expect(detectMentionQuery('Salut @ju', 3)).toBeNull()
  })

  it('allows a full name, and stops at a sentence', () => {
    expect(detectMentionQuery('@Julie Mar', 10)).toEqual({ start: 0, query: 'Julie Mar' })
    expect(detectMentionQuery('@Julie Martin peux-tu', 21)).toBeNull()
  })

  it('does not cross a line break', () => {
    expect(detectMentionQuery('@ju\nsuite', 9)).toBeNull()
  })
})

describe('filterMentionable', () => {
  it('matches the start of any word of the name, accents and case aside', () => {
    expect(filterMentionable(people, 'mar').map((p) => p.id)).toEqual(['a', 'b'])
    expect(filterMentionable(people, 'elo').map((p) => p.id)).toEqual(['c'])
    expect(filterMentionable(people, 'DUR').map((p) => p.id)).toEqual(['c'])
  })

  it('lists the first few when nothing is typed, and none when nothing matches', () => {
    expect(filterMentionable(people, '', 2)).toHaveLength(2)
    expect(filterMentionable(people, 'zzz')).toEqual([])
  })
})

describe('applyMention', () => {
  it('replaces the typed part with the full name and puts the caret after it', () => {
    const match = detectMentionQuery('Salut @ju', 9)!
    expect(applyMention('Salut @ju', 9, match, 'Julie Martin')).toEqual({ text: 'Salut @Julie Martin ', caret: 20 })
  })

  it('keeps what follows the caret', () => {
    const match = detectMentionQuery('@ju voilà', 3)!
    expect(applyMention('@ju voilà', 3, match, 'Julie Martin').text).toBe('@Julie Martin  voilà')
  })
})

describe('mentionedIn', () => {
  it('keeps only the people still named in the text, once each', () => {
    expect(mentionedIn('@Julie Martin et @Julie Martin', people)).toEqual(['a'])
    expect(mentionedIn('plus de mention', people)).toEqual([])
    expect(mentionedIn('@Marc Leroy', people)).toEqual(['b'])
  })
})

describe('segmentsOf', () => {
  it('flags known mentions and leaves the rest', () => {
    expect(segmentsOf('Peux-tu voir ça @Julie Martin ?', ['Julie Martin'])).toEqual([
      { text: 'Peux-tu voir ça ', mention: false },
      { text: '@Julie Martin', mention: true },
      { text: ' ?', mention: false },
    ])
  })

  it('does not flag an @ that names nobody known', () => {
    expect(segmentsOf('écris à @inconnu', ['Julie Martin'])).toEqual([{ text: 'écris à @inconnu', mention: false }])
  })

  it('survives names with regex characters', () => {
    expect(segmentsOf('@Jean (Paul) II', ['Jean (Paul) II']).some((s) => s.mention)).toBe(true)
  })

  it('returns the text untouched when nobody is known', () => {
    expect(segmentsOf('texte', [])).toEqual([{ text: 'texte', mention: false }])
  })
})
