import { describe, expect, it } from 'vitest'
import { teamLinkRedirect } from './teamLink'
import { routes } from './routes'

describe('teamLinkRedirect', () => {
  it('sends a team link to the back-office, on that report', () => {
    expect(teamLinkRedirect({ params: { id: 'r-1' }, query: { equipe: 'dreux' } })).toEqual({
      path: '/admin/signalements', query: { open: 'r-1' }, replace: true,
    })
  })

  it('leaves the public page alone for everybody else', () => {
    expect(teamLinkRedirect({ params: { id: 'r-1' }, query: {} })).toBe(true)
  })

  it('is wired on the route the mobile app claims', () => {
    const route = (routes as any[]).find((r) => r.path === '/signalement/:id')
    expect(route.beforeEnter).toBe(teamLinkRedirect)
  })
})
