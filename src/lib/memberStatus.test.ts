import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { memberStatusInfo, isStaleInvite, lastSeen } from './memberStatus'

const NOW = Date.parse('2026-09-16T12:00:00.000Z')

/** Frozen: every assertion below counts back from a fixed instant. */
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})

afterEach(() => vi.useRealTimers())

function daysAgo(days: number): string {
  return new Date(NOW - days * 86_400_000).toISOString()
}

describe('memberStatusInfo', () => {
  it('names the three states', () => {
    expect(memberStatusInfo('invited').label).toBe('Invité')
    expect(memberStatusInfo('active').label).toBe('Actif')
    expect(memberStatusInfo('suspended').label).toBe('Suspendu')
  })

  it('falls back to the raw value rather than throwing', () => {
    expect(memberStatusInfo('unknown').label).toBe('unknown')
  })
})

describe('isStaleInvite', () => {
  /**
   * Nobody thinks to check who never answered their invitation, and an
   * account that does not exist is an agent who is not handling anything.
   */
  it('flags an invitation older than a week', () => {
    expect(isStaleInvite({ status: 'invited', invited_at: daysAgo(8) })).toBe(true)
  })

  it('leaves a fresh invitation alone', () => {
    expect(isStaleInvite({ status: 'invited', invited_at: daysAgo(2) })).toBe(false)
  })

  it('says nothing about a member who already joined', () => {
    expect(isStaleInvite({ status: 'active', invited_at: daysAgo(300) })).toBe(false)
    expect(isStaleInvite({ status: 'suspended', invited_at: daysAgo(300) })).toBe(false)
  })

  /** An invitation with no date cannot be called late. */
  it('stays quiet when the date is missing', () => {
    expect(isStaleInvite({ status: 'invited', invited_at: null })).toBe(false)
  })
})

describe('lastSeen', () => {
  /**
   * An absolute date needs mental arithmetic to answer the only question
   * being asked: is this account still in use?
   */
  it.each([
    [0, 'aujourd’hui'],
    [1, 'hier'],
    [3, 'il y a 3 j'],
    [60, 'il y a 2 mois'],
  ])('reads %i days ago as "%s"', (days, expected) => {
    expect(lastSeen(daysAgo(days))).toBe(expected)
  })

  it('says plainly that somebody never signed in', () => {
    expect(lastSeen(null)).toBe('jamais')
  })

  it('stops counting past a year', () => {
    expect(lastSeen(daysAgo(500))).toBe('il y a plus d’un an')
  })
})
