import { useAuthStore } from '@/stores/auth'
import { detectSlug } from '@/utils/detectSlug'
import { useApiCache } from './useApiCache'
import { ApiError, resolveApiErrorMessage } from '@/utils/apiError'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export { ApiError } from '@/utils/apiError'

interface ApiOptions {
  method?: string
  /**
   * Un objet, **jamais une chaîne** : `apiFetch` sérialise lui-même.
   *
   * Le type était `any`, et deux écrans passaient `JSON.stringify(...)` — le
   * corps partait donc encodé deux fois (`"{\"status\":…}"`), `express.json()`
   * le refusait, et le serveur répondait 500. C'est ainsi que la bascule d'une
   * commune silencieuse en commune citoyenne échouait en production
   * (ONSIGNALE-API-3), et que les trois gestes de modération échouaient de la
   * même façon sans que personne ne l'ait encore vu. `object` exclut les
   * chaînes à la compilation ; la garde plus bas les exclut à l'exécution, pour
   * ce qui arriverait encore typé `any`.
   */
  body?: object
  isFormData?: boolean
  signal?: AbortSignal
  cache?: {
    maxAge: number
  }
}

export function useApi() {
  const { getCached, setCache, invalidate, invalidatePattern, clear } = useApiCache()

  async function apiFetch<T = any>(path: string, options: ApiOptions = {}): Promise<T> {
    const auth = useAuthStore()
    const { method = 'GET', body, isFormData = false, signal, cache } = options

    if (cache && method === 'GET') {
      const cacheKey = `${path}`
      const cached = getCached<T>(cacheKey, cache.maxAge)
      
      if (cached !== null) {
        return cached
      }
    }

    const slug = detectSlug()
    const headers: Record<string, string> = {}

    // Omis plutôt qu'inventé : les pages publiques — un signalement, les
    // mentions légales — n'appartiennent à aucune commune, et le serveur
    // ignore cet en-tête en écriture de toute façon.
    if (slug) headers['X-Tenant-Slug'] = slug

    if (auth.accessToken) {
      headers['Authorization'] = `Bearer ${auth.accessToken}`
    }

    if (typeof (body as unknown) === 'string') {
      // Une erreur de programmation, pas de réseau : la dire tout de suite
      // plutôt que d'envoyer un corps que le serveur rejettera en 500.
      throw new TypeError(
        `apiFetch(${path}) : passez un objet comme corps, pas une chaîne — la sérialisation est faite ici.`,
      )
    }

    if (!isFormData && body) {
      headers['Content-Type'] = 'application/json'
    }

    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
      signal,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const code = errorData.error || `http_${response.status}`
      const detail = Array.isArray(errorData.details) && errorData.details[0]?.message
      const message = resolveApiErrorMessage(code, detail || errorData.message)
      throw new ApiError(code, message, response.status)
    }

    const data = await response.json()

    if (cache && method === 'GET') {
      const cacheKey = `${path}`
      setCache(cacheKey, data)
    }

    return data
  }

  return { 
    apiFetch,
    invalidateCache: invalidate,
    invalidateCachePattern: invalidatePattern,
    clearCache: clear,
  }
}
