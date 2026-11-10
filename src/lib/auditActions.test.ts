import { describe, it, expect } from 'vitest'
import { AUDIT_ACTIONS, auditActionInfo } from './auditActions'

/**
 * Every action the server can write, copied from the `AuditAction` union in
 * `server/src/services/auditService.ts`.
 *
 * Duplicated deliberately: the two packages do not share a build, and the
 * alternative — trusting that whoever adds an action remembers to name it —
 * is what left `service.completed` and `service.acknowledged` showing as raw
 * slugs in an administration screen, alongside a grey circle for an icon.
 *
 * Adding an action on the server without a label here now fails this test.
 */
const SERVER_ACTIONS = [
  'auth.login',
  'user.created',
  'user.invited',
  'user.role_changed',
  'user.revoked',
  'report.created',
  'report.status_changed',
  'report.service_notified',
  'service.acknowledged',
  'service.completed',
  'report.deleted',
  'report.bulk_deleted',
  'tenant.created',
  'tenant.status_changed',
  'tenant.launched',
  'tenant_config.updated',
  'tenant_categories.updated',
]

describe('the audit vocabulary', () => {
  it('names every action the server can write', () => {
    const missing = SERVER_ACTIONS.filter((action) => !(action in AUDIT_ACTIONS))

    expect(missing).toEqual([])
  })

  it('names nothing the server never writes', () => {
    const extra = Object.keys(AUDIT_ACTIONS).filter((action) => !SERVER_ACTIONS.includes(action))

    expect(extra).toEqual([])
  })

  it('gives each one a label, an icon and a tint', () => {
    for (const [action, info] of Object.entries(AUDIT_ACTIONS)) {
      expect(info.label, action).toBeTruthy()
      expect(info.icon, action).toBeTruthy()
      expect(info.classes, action).toContain('text-')
    }
  })

  /** A label must read as French, never as the code that produced it. */
  it('never leaves a dotted slug as a label', () => {
    for (const [action, info] of Object.entries(AUDIT_ACTIONS)) {
      expect(info.label, action).not.toContain('.')
      expect(info.label, action).not.toContain('_')
    }
  })

  /**
   * An audit trail that hides an action it cannot name is worse than one
   * showing `service.completed`: the row has to exist, however badly dressed.
   */
  it('falls back to the raw code rather than dropping the row', () => {
    expect(auditActionInfo('something.new').label).toBe('something.new')
    expect(auditActionInfo('something.new').icon).toBe('Circle')
  })

  /**
   * A service acting through its link is not a municipal agent acting from
   * the back-office. The audit trail exists for that difference to show.
   */
  it('tints the external service apart from the back-office', () => {
    expect(AUDIT_ACTIONS['service.acknowledged'].classes)
      .not.toBe(AUDIT_ACTIONS['report.status_changed'].classes)
  })
})
