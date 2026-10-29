import { detectSlug } from '@/utils/detectSlug'

/**
 * L'authentification, côté client.
 *
 * Elle passait par le SDK Supabase depuis le navigateur. Tout ce qui entoure
 * une connexion échappait alors au serveur : pas de limitation de débit sur les
 * identifiants, aucune validation de la charge utile, aucune trace dans les
 * logs d'audit, et un second appel pour apprendre le rôle — l'application
 * connaissait donc l'utilisateur avant de savoir ce qu'il avait le droit de
 * faire.
 *
 * Le jeton rendu reste celui de Supabase : on le confie ensuite au SDK, qui
 * continue d'assurer le rafraîchissement et la persistance. Réécrire cette
 * mécanique-là serait le meilleur moyen d'y introduire des bogues, pour rien.
 *
 * Ce module n'utilise pas `useApi` : celui-ci lit le jeton de la session, et
 * ces appels-là sont précisément ceux qui la créent.
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export type TenantRole = 'super_admin' | 'admin' | 'agent' | 'observer' | 'citizen'

export interface AuthUser {
  id: string
  email: string | null
  role: TenantRole
  isAnonymous: boolean
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  expires_in: number
  expires_at: number | null
  token_type: string
}

export interface AuthResult {
  user: AuthUser
  session: AuthSession
}

export class AuthApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(message: string, status: number, code: string) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
    this.code = code
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const slug = detectSlug()

  const response = await fetch(`${API_URL}/api/auth${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(slug ? { 'X-Tenant-Slug': slug } : {}),
      ...init.headers,
    },
  })

  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new AuthApiError(
      body.message ?? 'Une erreur est survenue.',
      response.status,
      body.error ?? 'unknown'
    )
  }

  return body as T
}

export const authApi = {
  login: (email: string, password: string) =>
    call<AuthResult>('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  /** Révoque la session côté serveur, pas seulement dans ce navigateur. */
  logout: (accessToken: string) =>
    call<{ success: true }>('/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }),

  /** Qui suis-je, et qu'ai-je le droit de faire dans cette commune. */
  session: (accessToken: string) =>
    call<{ user: AuthUser }>('/session', {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),

  forgotPassword: (email: string) =>
    call<unknown>('/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
}
