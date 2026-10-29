import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/detectSlug', () => ({ detectSlug: () => 'la-loupe' }))

import { authApi, AuthApiError } from './authApi'

type FetchCall = [string, RequestInit]

function respond(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response)
}

const SESSION = {
  user: { id: 'u1', email: 'agent@mairie.fr', role: 'admin', isAnonymous: false },
  session: { access_token: 'a', refresh_token: 'r', expires_in: 3600, expires_at: null, token_type: 'bearer' },
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('login', () => {
  it('sends the credentials as JSON, scoped to the commune', async () => {
    const fetchMock = vi.fn((..._args: unknown[]) => respond(200, SESSION))
    vi.stubGlobal('fetch', fetchMock)

    await authApi.login('agent@mairie.fr', 'motdepasse')

    const [url, init] = fetchMock.mock.calls[0] as unknown as FetchCall
    expect(url).toMatch(/\/api\/auth\/login$/)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['X-Tenant-Slug']).toBe('la-loupe')
    expect(JSON.parse(init.body as string)).toEqual({
      email: 'agent@mairie.fr',
      password: 'motdepasse',
    })
  })

  /**
   * The password must never reach the browser's address bar, its history, or a
   * server log — which is what a query string would do.
   */
  it('never puts the password in the URL', async () => {
    const fetchMock = vi.fn((..._args: unknown[]) => respond(200, SESSION))
    vi.stubGlobal('fetch', fetchMock)

    await authApi.login('agent@mairie.fr', 'motdepasse')

    expect(String(fetchMock.mock.calls[0][0])).not.toContain('motdepasse')
  })

  it('raises what the server said, with its code', async () => {
    vi.stubGlobal('fetch', () => respond(401, {
      error: 'invalid_credentials',
      message: 'Adresse e-mail ou mot de passe incorrect.',
    }))

    await expect(authApi.login('agent@mairie.fr', 'faux')).rejects.toMatchObject({
      status: 401,
      code: 'invalid_credentials',
      message: 'Adresse e-mail ou mot de passe incorrect.',
    })
  })

  it('stays readable when the server answers something unparseable', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve({
      ok: false,
      status: 502,
      json: async () => { throw new Error('not json') },
    } as unknown as Response))

    await expect(authApi.login('a@b.fr', 'motdepasse')).rejects.toBeInstanceOf(AuthApiError)
  })
})

describe('logout', () => {
  it('presents the session it means to revoke', async () => {
    const fetchMock = vi.fn((..._args: unknown[]) => respond(200, { success: true }))
    vi.stubGlobal('fetch', fetchMock)

    await authApi.logout('jeton-acces')

    const [url, init] = fetchMock.mock.calls[0] as unknown as FetchCall
    expect(url).toMatch(/\/api\/auth\/logout$/)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jeton-acces')
  })
})

describe('session', () => {
  it('asks who the caller is, with their token', async () => {
    const fetchMock = vi.fn((..._args: unknown[]) => respond(200, { user: SESSION.user }))
    vi.stubGlobal('fetch', fetchMock)

    const result = await authApi.session('jeton-acces')

    expect(result.user.role).toBe('admin')
    const [, init] = fetchMock.mock.calls[0] as unknown as FetchCall
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer jeton-acces')
  })
})

describe('forgotPassword', () => {
  /**
   * The answer is deliberately the same whether the address exists or not, so
   * the client must not treat either as a special case.
   */
  it('does not ask whether the address exists', async () => {
    const fetchMock = vi.fn((..._args: unknown[]) => respond(200, {}))
    vi.stubGlobal('fetch', fetchMock)

    await expect(authApi.forgotPassword('inconnu@mairie.fr')).resolves.toBeDefined()
  })
})
