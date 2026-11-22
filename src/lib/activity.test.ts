import { describe, it, expect } from 'vitest'
import { activityIcon, activityTitle, badgeLabel, timeAgo } from './activity'

describe('activityTitle', () => {
  it('is written from the reader\'s point of view', () => {
    expect(activityTitle({ kind: 'mention', actorName: 'Marc Leroy' })).toBe('Marc Leroy vous a mentionné')
    expect(activityTitle({ kind: 'assigned', actorName: 'Julie Martin' })).toBe('Julie Martin vous a confié un signalement')
    expect(activityTitle({ kind: 'citizen_reply', actorName: null })).toBe('Un habitant a répondu')
  })

  it('stays true when nobody is named — automatic routing, or a colleague who left', () => {
    expect(activityTitle({ kind: 'assigned', actorName: null })).toBe('Un signalement vous a été confié')
    expect(activityTitle({ kind: 'mention', actorName: null })).toBe('Un collègue vous a mentionné')
  })
})

describe('activityIcon', () => {
  it('gives each kind its own icon', () => {
    expect(new Set([activityIcon('mention'), activityIcon('assigned'), activityIcon('citizen_reply')]).size).toBe(3)
  })
})

describe('timeAgo', () => {
  const now = Date.parse('2026-11-22T12:00:00Z')
  const ago = (ms: number) => new Date(now - ms).toISOString()

  it('reads as a person would say it', () => {
    expect(timeAgo(ago(20_000), now)).toBe('à l’instant')
    expect(timeAgo(ago(5 * 60_000), now)).toBe('il y a 5 min')
    expect(timeAgo(ago(3 * 3600_000), now)).toBe('il y a 3 h')
    expect(timeAgo(ago(30 * 3600_000), now)).toBe('hier')
    expect(timeAgo(ago(4 * 86_400_000), now)).toBe('il y a 4 j')
  })
})

describe('badgeLabel', () => {
  it('caps at 9+: past nine, the exact number no longer helps', () => {
    expect(badgeLabel(3)).toBe('3')
    expect(badgeLabel(9)).toBe('9')
    expect(badgeLabel(10)).toBe('9+')
    expect(badgeLabel(250)).toBe('9+')
  })
})
