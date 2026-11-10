import { describe, it, expect } from 'vitest'
import { resolveAccess, type AccessState } from './guards'
import { routes } from './routes'

const ANONYMOUS: AccessState = { isAuthenticated: false, isAdmin: false, isSuperAdmin: false, role: null }
const CITIZEN: AccessState = { isAuthenticated: true, isAdmin: false, isSuperAdmin: false, role: 'citizen' }
const OBSERVER: AccessState = { isAuthenticated: true, isAdmin: false, isSuperAdmin: false, role: 'observer' }
const AGENT: AccessState = { isAuthenticated: true, isAdmin: false, isSuperAdmin: false, role: 'agent' }
const ADMIN: AccessState = { isAuthenticated: true, isAdmin: true, isSuperAdmin: false, role: 'admin' }
const SUPER_ADMIN: AccessState = { isAuthenticated: true, isAdmin: true, isSuperAdmin: true, role: 'super_admin' }

function target(meta: Record<string, unknown>, fullPath = '/admin/signalements') {
  return { meta, fullPath } as any
}

/** Every route name the guards can send someone to. */
function routeNames(): string[] {
  const names: string[] = []
  const walk = (list: any[]) => {
    for (const route of list) {
      if (route.name) names.push(String(route.name))
      if (route.children) walk(route.children)
    }
  }
  walk(routes as any[])
  return names
}

describe('resolveAccess', () => {
  it('sends an anonymous visitor to the sign-in page, keeping where they wanted to go', () => {
    expect(resolveAccess(target({ requiresAuth: true }, '/admin/equipe'), ANONYMOUS)).toEqual({
      name: 'auth',
      query: { redirect: '/admin/equipe' },
    })
  })

  it('lets an admin through', () => {
    expect(resolveAccess(target({ requiresAuth: true, minRole: 'admin' }), ADMIN)).toBeUndefined()
  })

  it('turns away an account with no role at all, and says why', () => {
    expect(resolveAccess(target({ requiresAuth: true, minRole: 'observer' }), CITIZEN)).toEqual({
      name: 'auth',
      query: { denied: '1' },
    })
  })

  /**
   * The bug the role levels exist for: the whole back-office demanded `admin`,
   * so a member invited as an agent or an observer got their email, chose a
   * password, and was bounced at the door. Their role was a coloured chip.
   */
  it.each([
    ['observer', OBSERVER],
    ['agent', AGENT],
  ])('lets an %s into the screens that only ask to be seen', (_name, who) => {
    expect(resolveAccess(target({ minRole: 'observer' }), who)).toBeUndefined()
  })

  it('lets an agent act, and an observer not', () => {
    expect(resolveAccess(target({ minRole: 'agent' }), AGENT)).toBeUndefined()
    expect(resolveAccess(target({ minRole: 'agent' }), OBSERVER)).toEqual({ name: 'AdminReports' })
  })

  /**
   * A member of the commune who simply lacks *this* screen goes back to the
   * one they have. Throwing them out to sign-in would suggest their session
   * expired.
   */
  it.each([
    ['observer', OBSERVER],
    ['agent', AGENT],
  ])('sends an %s back to the reports rather than to sign-in', (_name, who) => {
    expect(resolveAccess(target({ minRole: 'admin' }, '/admin/equipe'), who))
      .toEqual({ name: 'AdminReports' })
  })

  it('sends an admin back to the reports when a screen needs a super admin', () => {
    expect(resolveAccess(target({ requiresSuperAdmin: true }), ADMIN)).toEqual({ name: 'AdminReports' })
  })

  it('lets a super admin into a super admin screen', () => {
    expect(resolveAccess(target({ requiresSuperAdmin: true }), SUPER_ADMIN)).toBeUndefined()
  })

  it.each([
    ['admin', ADMIN],
    ['agent', AGENT],
    ['observer', OBSERVER],
  ])('keeps a signed-in %s off the sign-in page', (_name, who) => {
    expect(resolveAccess(target({ guestOnly: true }, '/connexion'), who)).toEqual({ name: 'AdminReports' })
  })

  /**
   * The bug this file exists for: an account with no rights used to be bounced
   * off the sign-in page too, which is the only page it can use.
   */
  it('leaves an account without rights on the sign-in page, so it cannot loop', () => {
    expect(resolveAccess(target({ guestOnly: true }, '/connexion'), CITIZEN)).toBeUndefined()
  })

  // Une page publique de l'application : celle d'un signalement, que n'importe
  // qui ouvre depuis le lien reçu par e-mail. Les pages légales ne sont plus
  // des routes — ce sont des documents de `site/`.
  it('leaves a public page alone', () => {
    expect(resolveAccess(target({}, '/signalement/abc'), ANONYMOUS)).toBeUndefined()
  })
})

describe('guard targets', () => {
  /**
   * Every redirect the guards can produce must name a route that exists.
   * `router.push` rejects an unknown name in silence: the user stays where they
   * are, signed out, in front of a screen they no longer have access to.
   */
  it('only points at routes that exist', () => {
    const names = routeNames()
    const states: AccessState[] = [ANONYMOUS, CITIZEN, ADMIN, SUPER_ADMIN]
    const metas = [
      { requiresAuth: true },
      { requiresAuth: true, requiresAdmin: true },
      { requiresAuth: true, requiresAdmin: true, requiresSuperAdmin: true },
      { guestOnly: true },
    ]

    for (const meta of metas) {
      for (const state of states) {
        const result = resolveAccess(target(meta), state) as { name?: string } | undefined
        if (result?.name) expect(names).toContain(result.name)
      }
    }
  })
})
