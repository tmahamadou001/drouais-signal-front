import { describe, it, expect } from 'vitest'
import { tenantStatusInfo, planLabel, TENANT_STATUSES, ASSIGNABLE_TENANT_STATUSES } from './tenantStatus'

describe('the platform vocabulary', () => {
  /**
   * The column showed `trial` and `suspended` — the database's own words, in
   * an administration screen read by people who never see the database.
   */
  it('reads every status in French', () => {
    for (const [status, info] of Object.entries(TENANT_STATUSES)) {
      expect(info.label, status).not.toBe(status)
      expect(info.label, status).not.toContain('_')
    }
  })

  it('gives each one an icon and a tint from the platform palette', () => {
    for (const [status, info] of Object.entries(TENANT_STATUSES)) {
      expect(info.icon, status).toBeTruthy()
      expect(info.classes, status).toMatch(/bg-(brand|status)/)
    }
  })

  /** `prospect` is a state a commune reaches on its own, never one we assign. */
  it('never offers prospect as something to pick', () => {
    expect(ASSIGNABLE_TENANT_STATUSES).not.toContain('prospect')
    expect(ASSIGNABLE_TENANT_STATUSES.every((status) => status in TENANT_STATUSES)).toBe(true)
  })

  it('falls back to the raw value rather than throwing', () => {
    expect(tenantStatusInfo('churned').label).toBe('churned')
    expect(planLabel('custom')).toBe('custom')
  })
})
