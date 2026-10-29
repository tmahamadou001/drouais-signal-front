import { describe, it, expect } from 'vitest'
import { hasAtLeast, roleInfo, ROLES, ASSIGNABLE_ROLES, ROLE_ORDER } from './roles'

describe('hasAtLeast', () => {
  /**
   * The bug these levels exist for: the whole back-office demanded `admin`, so
   * a member invited as an agent got their email, chose a password, and was
   * bounced at the door. Their role was a coloured chip.
   */
  it('lets each role reach what it is meant to reach', () => {
    expect(hasAtLeast('observer', 'observer')).toBe(true)
    expect(hasAtLeast('agent', 'observer')).toBe(true)
    expect(hasAtLeast('admin', 'agent')).toBe(true)
    expect(hasAtLeast('super_admin', 'admin')).toBe(true)
  })

  it('stops each role short of what it is not', () => {
    expect(hasAtLeast('observer', 'agent')).toBe(false)
    expect(hasAtLeast('agent', 'admin')).toBe(false)
    expect(hasAtLeast('admin', 'super_admin')).toBe(false)
  })

  /** A citizen holds no role in the commune, and `null` is not a role either. */
  it('refuses anything that is not a team role', () => {
    expect(hasAtLeast('citizen', 'observer')).toBe(false)
    expect(hasAtLeast(null, 'observer')).toBe(false)
    expect(hasAtLeast('', 'observer')).toBe(false)
  })
})

describe('the vocabulary', () => {
  /**
   * The summary is what makes somebody pick right the first time: "Agent"
   * means nothing to a town-hall secretary inviting a colleague.
   */
  it('explains every role in a sentence', () => {
    for (const [role, info] of Object.entries(ROLES)) {
      expect(info.label, role).toBeTruthy()
      expect(info.summary.length, role).toBeGreaterThan(20)
    }
  })

  it('never offers super_admin as something a commune can hand out', () => {
    expect(ASSIGNABLE_ROLES).not.toContain('super_admin')
    expect(ASSIGNABLE_ROLES.every((role) => ROLE_ORDER.includes(role))).toBe(true)
  })

  it('falls back to the raw value rather than throwing', () => {
    expect(roleInfo('citizen').label).toBe('citizen')
  })
})
